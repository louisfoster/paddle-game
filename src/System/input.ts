import { LogHandler, LogLevel } from "../logHandler"
import { SubscriberHandler } from "../subscriberHandler"
import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent } from "../Component/player"
import { generateID, listen } from "../helpers"

interface ComponentGeneric
{
	id: string
	instance: Component
}

interface InputRead
{
	index: number
	btn: number
	pot: number
	select?: {
		state: PlayerSelectState
		stateTime: number
	}
}

enum PlayerSelectState
{
	init = `init`,
	first_up = `first_up`,
	first_down = `first_down`,
	final_up = `final_up`,
	confirmed = `confirmed`
}

interface PlayerInput
{
	id: string
	inputIndex: number
	move: number
	rotation: number
	adcRead: number
	rotateDirection: number
}

/**
 * - single player = keyboard mode
 * - 1 - 3 players = controller mode
 * 
 * - if controller mode,
 * 	- start getting serial data
 * 	- detect initial button states
 * 	- request "hold for a moment then release"
 * 	- all controllers than went from 0 (> 100ms) - 1 (> 100ms) - 0 (> 500ms), get activated
 * 		- init state
 *		- first up (0 detected, return to init if 1 < 100ms)
 *		- first down (1 detect after > 100ms of uninterrupted 0, return to init if 0 < 100ms))
 *		- final up (0 detect after > 100ms of uninterrupted 1, return to init if 1 < 500ms))
 *		- confirmed (no further changes after > 500ms of 0)
 *		- 3 sec after first confirmed, start game
 *		- 10 sec no confirm, emit error
 * 	- emit number of players and their associated controller index
 * 	- begin emitting controller data for those players
 */
export class InputSystem implements Observer<ComponentEntity>, LogObservable, InputStateObservable, StringObservable
{
	private components: ComponentGeneric[]

	private idMap: Record<string, number>

	public logObservable: SubscriberHandler<Log>

	private log: LogHandler

	private port?: SerialPort

	private mode?: InputMode

	private state: InputState

	private dataParse: {
		parsing: boolean
		inputs: InputRead[]
	}

	private playerInput: Record<string, PlayerInput>

	private inputIndexPlayerIdMap: Record<number, string>

	private timeout: {
		tooLong: number
		finish: number
	}
	
	public inputStateObservable: SubscriberHandler<InputState>

	public stringObservable: SubscriberHandler<string>

	constructor()
	{
		this.log = new LogHandler()

		this.logObservable = this.log.logObservable

		this.inputStateObservable = new SubscriberHandler()

		this.stringObservable = new SubscriberHandler()

		this.state = `init`

		this.dataParse = {
			parsing: false,
			inputs: [
				{ index: 0, btn: 0, pot: 0 },
				{ index: 1, btn: 0, pot: 0 },
				{ index: 2, btn: 0, pot: 0 },
			]
		}

		this.components = []

		this.idMap = {}

		this.inputIndexPlayerIdMap = {}

		this.playerInput = {}

		this.timeout = {
			finish: 0,
			tooLong: 0
		}
	}

	private setState( state: InputState )
	{
		this.state = state

		this.inputStateObservable.next( this.state )		
	}

	private handleKeyInput()
	{
		const ev = listen( document )

		ev.on( `keydown` ).do( ( event ) =>
		{
			const key = event.key

			const player = this.playerInput[ this.inputIndexPlayerIdMap[ 0 ] ]

			switch( key )
			{
				case `ArrowUp`:

				case `w`:

					player.move = player.move !== -1 ? 1 : -1

					break

				case `ArrowLeft`:

				case `a`:

					player.rotateDirection = -1

					break
					
				case `ArrowRight`:

				case `d`:

					player.rotateDirection = 1

					break
			}
		} )

		ev.on( `keyup` ).do( ( event ) =>
		{
			const key = event.key

			const player = this.playerInput[ this.inputIndexPlayerIdMap[ 0 ] ]

			switch( key )
			{
				case `ArrowUp`:

				case `w`:

					player.move = 0

					break

				case `ArrowLeft`:

				case `a`:
					
				case `ArrowRight`:

				case `d`:

					player.rotateDirection = 0

					break
			}
		} )

		this.assignPlayerToInput( 0 )
	}

	private handleControlInput()
	{
		if ( this.port ) return

		// Permissions are required to access serial port
		navigator.serial.requestPort()
			.then( ( port: SerialPort ) => 
			{
				// Connect to `port` or add it to the list of available ports.
				this.port = port

				return this.readPort()
			} )
			.catch( ( e ) => 
			{
				// The user didn't select a port.
				this.log.log( LogLevel.warn, e )

				this.setState( `error` )
			} )
	}

	private async readPort()
	{
		if ( !this.port )
		{
			this.log.log( LogLevel.warn, `No port available` )

			return
		}

		// Pico has baud rate of 115200
		await this.port.open( { baudRate: 115200 } )

		this.log.log( LogLevel.info, `Serial connected` )

		if ( this.port.readable ) 
		{
			const reader = this.port.readable.getReader()

			let run = true

			// emit serial input ready

			this.setState( `player-select` )

			this.timeout.tooLong = window.setTimeout( () =>
			{
				this.setState( `init` )
			}, 10000 )

			try 
			{
				while ( run ) 
				{
					// Exit if serial reading returns false (done)
					if ( !this.handleSerial( await reader.read() ) )
					{
						run = false

						break
					}
				}
			}
			catch ( error ) 
			{
				this.log.log( LogLevel.error, ( error as Error ).message )
			}
			finally 
			{
				this.log.log( LogLevel.warn, `Serial exiting` )

				reader.releaseLock()
			}
		}
	}

	private handleSerial( { value, done }: ReadableStreamDefaultReadResult<Uint8Array> )
	{
		if ( done )
		{
			return false
		}

		// currently parsing block
		if ( this.dataParse.parsing ) return true

		/**
		 * MESSAGE STRUCTURE
		 * 
		 * |---- S: 1 byte ----|
		 * [starting byte = 192]
		 * 
		 * 
		 * Then, for each input: 0, 1, 2
		 * 
		 * |------ N.1: 1 byte -----||----------- N.2: 2 bytes ------------|
		 * [input N btn value (0, 1)][input N potentiometer value (0, 6283)]
		 * 
		 *  1  1   2   1   2   1   2    = 10 bytes
		 * |S|0.1|0.2|1.1|1.2|2.1|2.2|
		 * 
		 * 
		 */


		const messageLength = 10

		if ( value && value[ 0 ] === 0xc0 && value.length >= messageLength )
		{
			this.dataParse.parsing = true

			for ( let i = 0; i < this.dataParse.inputs.length; i += 1 )
			{
				const offset = i * 3 + 1

				const input = this.dataParse.inputs[ i ]
	
				input.btn = value[ offset ]

				if ( this.state === `player-select` )
				{
					// ignore adc values, only observe button

					const stateTime = performance.now()

					if ( !input.select )
					{
						input.select = {
							state: input.btn === 0
								? PlayerSelectState.first_up
								: PlayerSelectState.init,
							stateTime
						}
					}
					else
					{
						switch( input.select.state )
						{
							case PlayerSelectState.init:

								if ( this.dataParse.inputs[ i ].btn === 0 )
								{
									input.select.state = PlayerSelectState.first_up

									input.select.stateTime = stateTime
								}

								break

							case PlayerSelectState.first_up:

								if ( this.dataParse.inputs[ i ].btn === 1 )
								{
									input.select.state = ( stateTime - input.select.stateTime < 100 )
										? PlayerSelectState.init
										: PlayerSelectState.first_down

									input.select.stateTime = stateTime
								}

								break

							case PlayerSelectState.first_down:

								if ( this.dataParse.inputs[ i ].btn === 0 )
								{
									input.select.state = ( stateTime - input.select.stateTime < 100 )
										? PlayerSelectState.init
										: PlayerSelectState.final_up

									input.select.stateTime = stateTime
								}

								break

							case PlayerSelectState.final_up:

								if ( input.btn === 1 )
								{
									input.select.state = PlayerSelectState.init

									input.select.stateTime = stateTime
								}
								else if ( stateTime - input.select.stateTime >= 500 )
								{
									input.select.state = PlayerSelectState.confirmed

									this.assignPlayerToInput( i )
								}

								break

						}
					}
				}
				else if ( this.state === `ready` && this.playerInput[ this.inputIndexPlayerIdMap[ i ] ] )
				{
					const player = this.playerInput[ this.inputIndexPlayerIdMap[ i ] ]

					const noiseThreshold = 50	

					input.pot = value[ offset + 2 ] | value[ offset + 1 ] << 8

					if ( input.btn === 1 )
					{
						player.move = player.move !== -1 ? 1 : -1
					}
					else
					{
						player.move = 0
					}
		
					if ( Math.abs( input.pot - player.rotation ) > noiseThreshold )
					{
						player.rotation = input.pot
					}
				}
	
	
				this.dataParse.parsing = false
			}
		}
		else
		{
			this.log.log( LogLevel.warn, `Received ${value}` )
		}

		return true
	}

	private assignPlayerToInput( inputIndex: number )
	{
		clearTimeout( this.timeout.tooLong )

		const id = generateID()

		this.playerInput[ id ] = {
			id,
			inputIndex,
			adcRead: 0,
			move: 0,
			rotateDirection: 0,
			rotation: 0
		}

		this.inputIndexPlayerIdMap[ inputIndex ] = id

		this.stringObservable.next( id )

		// finish
		clearTimeout( this.timeout.finish )

		this.timeout.finish = window.setTimeout( () =>
		{
			this.setState( `ready` )
		}, 3000 )
	}

	private isCapsule( component: Component ): component is CapsuleComponent
	{
		return component instanceof CapsuleComponent
	}

	private isPlayer( component: Component ): component is PlayerComponent
	{
		return component instanceof PlayerComponent
	}

	public update()
	{
		if ( this.mode === `keyboard` )
		{
			const player = this.playerInput[ this.inputIndexPlayerIdMap[ 0 ] ]

			player.rotation = player.rotation + ( ( 10 * player.rotateDirection ) * 360 * Math.PI / 180 )
		}

		for ( const component of this.components )
		{
			const obj = component.instance

			if ( this.isCapsule( obj ) )
			{
				if ( obj.occupiedBy )
				{
					const playerEntity = this.components[ this.idMap[ obj.occupiedBy ] ].instance

					if ( !this.isPlayer( playerEntity ) ) return

					const player = this.playerInput[ playerEntity.inputID ]

					if ( player.move )
					{
						if ( obj.moving === CapsuleMove.pre )
							obj.moving = CapsuleMove.active
					}
					else if ( obj.moving === CapsuleMove.active )
					{
						obj.moving = CapsuleMove.end
					}
				}
			}
			else if ( this.isPlayer( obj ) )
			{
				const player = this.playerInput[ obj.inputID ]

				obj.setRotation( player.rotation )

				if ( !obj.inCapsule && player.move === 1 )
				{
					player.move = -1

					obj.moveForward()
				}
			}
		}
	}

	next( component: ComponentEntity )
	{
		this.idMap[ component.id ] = this.components.length 

		this.components.push( {
			id: component.id,
			instance: component.instance
		} )
	}

	public init( mode: InputMode )
	{
		this.mode = mode

		switch( mode )
		{
			case `controller`:

				this.handleControlInput()

				break

			case `keyboard`:

				this.handleKeyInput()

				break
		}
	}
}
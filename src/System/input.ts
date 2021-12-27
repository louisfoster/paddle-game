import { LogHandler, LogLevel } from "../logHandler"
import { SubscriberHandler } from "../subscriberHandler"
import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent, PlayerState } from "../Component/player"
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

interface InputReadSelect extends InputRead
{
	select: {
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

	private activatePlayerStates: Record<PlayerSelectState, ( input: InputReadSelect, stateTime: number ) => boolean>

	private onKeyDown: Record<string, ( player: PlayerInput ) => void>

	private onKeyUp: Record<string, ( player: PlayerInput ) => void>
	
	public inputStateObservable: SubscriberHandler<InputState>

	public stringObservable: SubscriberHandler<string>

	constructor()
	{
		this.log = new LogHandler()

		this.logObservable = this.log.logObservable

		this.inputStateObservable = new SubscriberHandler()

		this.stringObservable = new SubscriberHandler()

		this.state = `init`

		/**
		 * Storage for received serial data
		 */
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

		/**
		 * These steps outline the states a button goes through over time
		 * to ensure a player is active, and connected.
		 */
		this.activatePlayerStates = {
			[ PlayerSelectState.init ]: ( input, stateTime ) =>
			{
				// First, the button should be in an unpressed state
				// (disconnected controllers are always in pressed state)
				if ( input.btn === 0 )
				{
					input.select.state = PlayerSelectState.first_up

					input.select.stateTime = stateTime
				}

				return false
			},
			[ PlayerSelectState.first_up ]: ( input, stateTime ) =>
			{
				// The player then presses the button, no less than 100ms from
				// stating in the 0 state (to avoid momentary switches between 0 and 1 from the ADC)
				if ( input.btn === 1 )
				{
					input.select.state = ( stateTime - input.select.stateTime < 100 )
						? PlayerSelectState.init
						: PlayerSelectState.first_down

					input.select.stateTime = stateTime
				}

				return false
			},
			[ PlayerSelectState.first_down ]: ( input, stateTime ) =>
			{
				// The player then releases the button no less than 100ms later
				if ( input.btn === 0 )
				{
					input.select.state = ( stateTime - input.select.stateTime < 100 )
						? PlayerSelectState.init
						: PlayerSelectState.final_up

					input.select.stateTime = stateTime
				}

				return false
			},
			[ PlayerSelectState.final_up ]: ( input, stateTime ) =>
			{
				// As long as the button is still unpressed after half a second
				// it then is confirmed, and returns true to trigger
				// adding the input and creating the player
				if ( input.btn === 1 )
				{
					input.select.state = PlayerSelectState.init

					input.select.stateTime = stateTime
				}
				else if ( stateTime - input.select.stateTime >= 500 )
				{
					input.select.state = PlayerSelectState.confirmed

					return true
				}

				return false
			},
			[ PlayerSelectState.confirmed ]: () => false
		}

		this.onKeyDown = {
			ArrowUp: player =>
			{
				player.move = player.move !== -1 ? 1 : -1
			},
			w: player =>
			{
				player.move = player.move !== -1 ? 1 : -1
			},
			ArrowLeft: player =>
			{
				player.rotateDirection = -1
			},
			a: player =>
			{
				player.rotateDirection = -1
			},

			ArrowRight: player =>
			{
				player.rotateDirection = 1
			},
			d: player =>
			{
				player.rotateDirection = 1
			},
		}

		this.onKeyUp = {
			ArrowUp: player =>
			{
				player.move = 0
			},
			w: player =>
			{
				player.move = 0
			},
			ArrowLeft: player =>
			{
				player.rotateDirection = 0
			},
			a: player =>
			{
				player.rotateDirection = 0
			},
			ArrowRight: player =>
			{
				player.rotateDirection = 0
			},
			d: player =>
			{
				player.rotateDirection = 0
			},
		}
	}

	private setState( state: InputState )
	{
		this.state = state

		this.inputStateObservable.next( this.state )
	}

	/**
	 * If using keyboard, listen for keydown/up events
	 */
	private handleKeyInput()
	{
		const ev = listen( document )

		ev.on( `keydown` ).do( ( event ) =>
			this.onKeyDown[ event.key ]?.( this.playerInput[ this.inputIndexPlayerIdMap[ 0 ] ] ) )

		ev.on( `keyup` ).do( ( event ) =>
			this.onKeyUp[ event.key ]?.( this.playerInput[ this.inputIndexPlayerIdMap[ 0 ] ] ) )

		// only 1 player available in this mode
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
				// loop occurs asynchronously, that's why it doesn't block
				// not sure if this could be done better though
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

		// check for starting byte and correct message length
		if ( value && value[ 0 ] === 0xc0 && value.length >= messageLength )
		{
			this.dataParse.parsing = true

			for ( let i = 0; i < this.dataParse.inputs.length; i += 1 )
			{
				const offset = i * 3 + 1

				const input = this.dataParse.inputs[ i ]
	
				input.btn = value[ offset ]

				// view is activating players
				if ( this.state === `player-select` )
				{
					// ignore adc values, only observe button

					const stateTime = performance.now()

					if ( !this.isInputSelect( input ) )
					{
						input.select = {
							state: input.btn === 0
								? PlayerSelectState.first_up
								: PlayerSelectState.init,
							stateTime
						}
					}
					else if ( this.activatePlayerStates[ input.select.state ]( input, stateTime ) )
					{
						this.assignPlayerToInput( i )
					}
				}
				// view is in play mode
				else if ( this.state === `ready` && this.playerInput[ this.inputIndexPlayerIdMap[ i ] ] )
				{
					const player = this.playerInput[ this.inputIndexPlayerIdMap[ i ] ]

					// noise threshold prevent "wobbling"
					const noiseThreshold = 50	

					input.pot = value[ offset + 2 ] | value[ offset + 1 ] << 8

					player.move = input.btn === 1
						? player.move !== -1 ? 1 : -1
						: 0
		
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

	private isInputSelect( input: InputRead ): input is InputReadSelect
	{
		return `select` in input
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

		// wait for other players to activate
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
				// move capsule only when its occupied
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
					// if the player has stopped moving, eject it
					else if ( obj.moving === CapsuleMove.active )
					{
						obj.moving = CapsuleMove.end

						playerEntity.state = PlayerState.ejecting
					}
				}
			}
			else if ( this.isPlayer( obj ) )
			{
				const player = this.playerInput[ obj.inputID ]

				obj.setRotation( player.rotation )

				if ( !obj.inCapsule && player.move === 1 )
				{
					// player needs to press again to continue acceleration
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
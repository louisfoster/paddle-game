import { LogHandler, LogLevel } from "../logHandler"
import type { SubscriberHandler } from "../subscriberHandler"
import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent } from "../Component/player"
import { listen } from "../helpers"

interface ComponentGeneric
{
	id: string
	instance: Component
}

/**
 * - listen to key input
 * - listen to web serial input
 * - listen to global input fns
 * 
 * - rotate player on rotation value
 * - set moving/acceleration of capsule / player on forward 
 */
export class InputSystem implements Observer<ComponentEntity>, LogObservable
{
	private components: ComponentGeneric[]

	private idMap: Record<string, number>

	private rotation: number
	
	private rotateDirection: number

	private move: number

	public logObservable: SubscriberHandler<Log>

	private log: LogHandler

	private port?: SerialPort

	private adcRead: number

	private mode?: InputMode

	constructor()
	{
		this.log = new LogHandler()

		this.logObservable = this.log.logObservable

		this.components = []

		this.idMap = {}

		this.rotation = 0.15
		
		this.rotateDirection = 0

		this.move = 0

		this.adcRead = 0
	}

	private handleKeyInput()
	{
		const ev = listen( document )

		ev.on( `keydown` ).do( ( event ) =>
		{
			const key = event.key

			switch( key )
			{
				case `ArrowUp`:

				case `w`:

					this.move = this.move !== -1 ? 1 : -1

					break

				case `ArrowLeft`:

				case `a`:

					this.rotateDirection = -1

					break
					
				case `ArrowRight`:

				case `d`:

					this.rotateDirection = 1

					break
			}
		} )

		ev.on( `keyup` ).do( ( event ) =>
		{
			const key = event.key

			switch( key )
			{
				case `ArrowUp`:

				case `w`:

					this.move = 0

					break

				case `ArrowLeft`:

				case `a`:
					
				case `ArrowRight`:

				case `d`:

					this.rotateDirection = 0

					break
			}
		} )
	}

	private handleControlInput()
	{
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

		const messageLength = 4

		if ( value && value[ 0 ] === 0xc0 && value.length >= messageLength )
		{
			const noiseThreshold = 100

			const adcVal = value[ 2 ] | value[ 1 ] << 8

			const btnVal = value[ 3 ]

			if ( btnVal === 1 )
			{
				this.move = this.move !== -1 ? 1 : -1
			}
			else
			{
				this.move = 0
			}

			if ( Math.abs( adcVal - this.adcRead ) > noiseThreshold )
			{
				this.adcRead = adcVal

				this.rotation = adcVal < 255 ? 0 : ( adcVal / 65535 )
			}
		}
		else
		{
			this.log.log( LogLevel.warn, `Received ${value}` )
		}

		return true
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
			this.rotation = this.rotation + ( 0.02 * this.rotateDirection )

		for ( const component of this.components )
		{
			const obj = component.instance

			if ( this.isCapsule( obj ) )
			{
				if ( obj.occupiedBy )
				{
					if ( this.move )
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
				obj.setRotation( this.rotation )

				if ( !obj.inCapsule && this.move === 1 )
				{
					this.move = -1

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
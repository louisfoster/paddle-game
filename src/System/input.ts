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
export class InputSystem implements Observer<ComponentEntity>
{
	private components: ComponentGeneric[]

	private idMap: Record<string, number>

	private rotation: number
	
	private rotateDirection: number

	private move: number

	constructor()
	{
		this.components = []

		this.idMap = {}

		this.rotation = 0.15
		
		this.rotateDirection = 0

		this.move = 0

		this.handleKeyInput()
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
					this.move = this.move !== -1 ? 1 : -1

					break

				case `ArrowLeft`:
					this.rotateDirection = -1

					break
					
				case `ArrowRight`:
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
					this.move = 0

					break

				case `ArrowLeft`:

				case `ArrowRight`:

					this.rotateDirection = 0

					break
			}
		} )
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
				if ( this.rotateDirection !== 0 )
				{
					this.rotation = this.rotation + ( 0.02 * this.rotateDirection )

					obj.setRotation( this.rotation )
				}

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
}
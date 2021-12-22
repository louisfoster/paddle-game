import { SequencerComponent } from "../Component/sequencer"
import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent } from "../Component/player"
import { bound, randomPosition } from "../helpers"

interface ComponentTyped<T>
{
	id: string
	instance: T
	position: Vector
}

interface ComponentGeneric
{
	id: string
	instance: Component
	position: Vector
}


/**
 * on user forward input
 * - if player, and player isn't in capsule, and player has acceleration, move player with momentum
 * - if capsule, and capsule has player, get player rotation, move capsule + player forward
 * 
 * on user rotate input
 * - rotate player
 */
export class PhysicalSystem implements Observer<ComponentEntity>
{
	private components: ComponentGeneric[]

	private idMap: Record<string, number>

	constructor()
	{
		this.components = []

		this.idMap = {}
	}

	/**
	 * 
	 * 
	 * PLAYER
	 * 
	 * 
	 *  
	 */

	private isPlayer( component: ComponentGeneric ): component is ComponentTyped<PlayerComponent>
	{
		return component.instance instanceof PlayerComponent
	}

	private updatePlayer( delta: number, ctx: CanvasRenderingContext2D, player: ComponentTyped<PlayerComponent> )
	{
		const { instance: obj } = player

		if ( obj.inCapsule )
		{
			const capsule = this.components[ this.idMap[ obj.inCapsule ] ]

			if ( !this.isCapsule( capsule ) ) return

			player.position.x = capsule.position.x

			player.position.y = capsule.position.y

			if ( capsule.instance.moving === CapsuleMove.end )
			{
				const { x, y } = randomPosition()

				player.position.x = x

				player.position.y = y

				player.instance.inCapsule = ``

				capsule.instance.occupiedBy = ``
			}
		}
		else
		{
			const distance = obj.acceleration > 0
				? obj.acceleration * ( delta * 0.00001 ) + 0.0001
				: 0

			obj.acceleration = obj.acceleration > 0
				? obj.acceleration - ( delta * 0.005 )
				: 0
	
			if ( distance )
			{
				player.position.x =
					bound( distance
					* Math.cos( ( obj.rotation * 360 ) * Math.PI / 180 )
					+ player.position.x )
	
				player.position.y =
					bound( ( distance * ( ctx.canvas.width / ctx.canvas.height ) ) 
					* Math.sin(  ( obj.rotation * 360 ) * Math.PI / 180 )
					+ player.position.y )
			}
		}
	}



	/**
	 * 
	 * 
	 * CAPSULE
	 * 
	 * 
	 *  
	 */


	private isCapsule( component: ComponentGeneric ): component is ComponentTyped<CapsuleComponent>
	{
		return component.instance instanceof CapsuleComponent
	}
 
	private updateCapsule( delta: number, ctx: CanvasRenderingContext2D, capsule: ComponentTyped<CapsuleComponent> )
	{
		const { instance: obj } = capsule

		if ( obj.moving === CapsuleMove.active && obj.occupiedBy )
		{
			const player = this.components[ this.idMap[ obj.occupiedBy ] ]

			if ( !this.isPlayer( player ) ) return

			capsule.position.x =
				bound( ( 0.0001 * delta )
				* Math.cos( ( player.instance.rotation * 360 ) * Math.PI / 180 )
				+ capsule.position.x )

			capsule.position.y =
				bound( ( ( 0.0001 * delta ) * ( ctx.canvas.width / ctx.canvas.height ) ) 
				* Math.sin(  ( player.instance.rotation * 360 ) * Math.PI / 180 )
				+ capsule.position.y )
		}
	}



	/**
	 * 
	 * 
	 * SEQUENCER
	 * 
	 * 
	 *  
	 */


	private isSequencer( component: ComponentGeneric ): component is ComponentTyped<SequencerComponent>
	{
		return component.instance instanceof SequencerComponent
	}
 
	private updateSequencer( ctx: CanvasRenderingContext2D, sequencer: ComponentTyped<SequencerComponent> )
	{
		const { instance: obj } = sequencer

		const capsule = this.components[ this.idMap[ obj.fromCapsule ] ]

		if ( this.isCapsule( capsule ) )
		{
			if ( capsule.instance.moving === CapsuleMove.active )
			{
				obj.next( { pos: capsule.position } )
			}
			else if ( capsule.instance.moving === CapsuleMove.end )
			{
				obj.next( { build: ctx } )

				capsule.instance.moving = CapsuleMove.sequence
			}
			else if ( capsule.instance.moving === CapsuleMove.sequence && obj.activeCirclePosition )
			{
				capsule.position.x = obj.activeCirclePosition.x

				capsule.position.y = obj.activeCirclePosition.y
			}
		}
	}




	/**
	 * 
	 * 
	 * PUBLIC METHODS
	 * 
	 * 
	 *  
	 */

	update( delta: number, ctx: CanvasRenderingContext2D )
	{
		for ( const component of this.components )
		{
			if ( this.isPlayer( component ) )
			{
				this.updatePlayer( delta, ctx, component )
			}

			if ( this.isCapsule( component ) )
			{
				this.updateCapsule( delta, ctx, component )
			}

			if ( this.isSequencer( component ) )
			{
				this.updateSequencer( ctx, component )
			}
		}
	}

	next( component: ComponentEntity )
	{
		this.idMap[ component.id ] = this.components.length 

		this.components.push( {
			id: component.id,
			instance: component.instance,
			position: randomPosition()
		} )
	}

	pos( id: string )
	{
		return this.components[ this.idMap[ id ] ].position
	}
}
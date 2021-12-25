import type { SequencerComponent } from "src/Component/sequencer"
import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent, PlayerState } from "../Component/player"
import { doTwoCirclesIntersect, vectorToCanvasCoords } from "../helpers"
import type { PhysicalSystem } from "./physical"


type CollidableComponent = Collidable & Component

interface ComponentBase
{
	id: string
	instance: Component
	collidable: boolean
}

interface ComponentCollidable extends ComponentBase
{
	instance: CollidableComponent
	collidable: true
}

interface ComponentUncollidable extends ComponentBase
{
	instance: SequencerComponent
	collidable: false
}

type ComponentGeneric = ComponentCollidable | ComponentUncollidable

interface PlayerCapsuleIntersect
{
	capsule: CapsuleComponent
	player: PlayerComponent
	capsuleID: string
	playerID: string
}

/**
 * - get position of all items
 * - detect collisions
 * - if capsule collides with player, player occupies capsule, unless players is already in a capsule
 * - if capsules collide, do nothing
 */
export class CollisionSystem implements Observer<ComponentEntity>
{
	private components: ComponentGeneric[]

	private idMap: Record<string, number>

	private collisions: [string, string][]

	constructor( private physicalSystem: PhysicalSystem )
	{
		this.components = []

		this.idMap = {}

		this.collisions = []
	}

	// intersecting players
	// intersecting capsules
	// intersecting player + capsule

	private whenPlayerCapsuleIntersect( componentA: ComponentBase, componentB: ComponentBase )
	{
		let res: PlayerCapsuleIntersect | undefined

		if ( this.isCapsule( componentA.instance ) && this.isPlayer( componentB.instance ) )
			res = {
				capsule: componentA.instance,
				player: componentB.instance,
				capsuleID: componentA.id,
				playerID: componentB.id }
		else if ( this.isCapsule( componentB.instance ) && this.isPlayer( componentA.instance ) )
			res = {
				capsule: componentB.instance,
				player: componentA.instance,
				capsuleID: componentB.id,
				playerID: componentA.id }
		
		return {
			do: ( fn: ( components: PlayerCapsuleIntersect ) => void ) => res && fn( res )
		}
	}

	private withPlayersWithNoCollision()
	{
		const players: PlayerComponent[] = []

		componentLoop:
		for ( let i = 0; i < this.components.length; i += 1 )
		{
			const component = this.components[ i ]

			if ( !this.isPlayer( component.instance ) ) continue

			for ( const [ a, b ] of this.collisions )
			{
				if ( component.id === a || component.id === b )
					continue componentLoop
			}

			players.push( component.instance )
		}

		return {
			do: ( fn: ( components: PlayerComponent[] ) => void ) => players.length > 0 && fn( players )
		}
	}

	private isCapsule( component: Component ): component is CapsuleComponent
	{
		return component instanceof CapsuleComponent
	}

	private isPlayer( component: Component ): component is PlayerComponent
	{
		return component instanceof PlayerComponent
	}
 
	update( ctx: CanvasRenderingContext2D )
	{
		const pos: Record<string, CanvasCoords> = {}

		this.collisions = []

		for ( let i = 0; i < this.components.length - 1; i += 1 )
		{
			// update all collisions
			// requires radius of bounding circle for a component
			const c0 = this.components[ i ]

			if ( !c0.collidable ) continue

			const _pos0 = pos[ c0.id ] 
				|| vectorToCanvasCoords( ctx.canvas, this.physicalSystem.pos( c0.id ) )

			if ( !pos[ c0.id ] ) pos[ c0.id ] = _pos0

			for ( let j = i + 1; j < this.components.length; j += 1 )
			{
				const c1 = this.components[ j ]

				if ( !c1.collidable ) continue

				const _pos1 = pos[ c1.id ] 
					|| vectorToCanvasCoords( ctx.canvas, this.physicalSystem.pos( c1.id ) )

				if ( !pos[ c1.id ] ) pos[ c1.id ] = _pos1

				doTwoCirclesIntersect(
					_pos0.left,
					_pos0.top,
					c0.instance.radius,
					_pos1.left,
					_pos1.top,
					c1.instance.radius )
				&& this.collisions.push( [ c0.id, c1.id ] )
			}
		}

		for ( const [ a, b ] of this.collisions )
		{
			const c0 = this.components[ this.idMap[ a ] ]

			const c1 = this.components[ this.idMap[ b ] ]

			this.whenPlayerCapsuleIntersect( c0, c1 )
				.do( ( { capsule, player, capsuleID, playerID } ) =>
				{
					// TODO: remove moving state condition
					if ( player.inCapsule || capsule.occupiedBy || player.state === PlayerState.ejecting ) return

					// if capsule move state is pre, just occupy it
					if ( capsule.moving === CapsuleMove.pre )
					{
						player.inCapsule = capsuleID

						capsule.occupiedBy = playerID
					}

					// if capsule is in sequence mode, occupy it, reset the sequence
					if ( capsule.moving === CapsuleMove.sequence )
					{
						// reset to original state
						capsule.moving = CapsuleMove.pre

						player.inCapsule = capsuleID

						capsule.occupiedBy = playerID

						const seq = this.components[ this.idMap[ capsule.hasSequence ] ]

						if ( this.isSequencer( seq ) )
						{
							seq.instance.reset()
						}
					} 
				} )
		}

		this.withPlayersWithNoCollision()
			.do( players =>
			{
				for ( const player of players )
				{
					// Re-enable capability to occupy capsules
					if ( player.state === PlayerState.ejecting )
						player.state = PlayerState.normal
				}
			} )
	}

	private isCollidable( component: Component ): component is CollidableComponent
	{
		return `radius` in component
	}

	private isSequencer( component: ComponentEntity ): component is ComponentUncollidable
	{
		return `audio` in component.instance
	}

	next( component: ComponentEntity )
	{
		this.idMap[ component.id ] = this.components.length

		if ( this.isCollidable( component.instance ) )
		{
			const c: ComponentCollidable = {
				collidable: true,
				id: component.id,
				instance: component.instance
			}

			this.components.push( c )
		}
		else if ( this.isSequencer( component ) )
		{
			const c: ComponentUncollidable = {
				collidable: false,
				id: component.id,
				instance: component.instance
			}

			this.components.push( c )
		}
	}
}
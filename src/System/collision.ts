/**
 * - get position of all items
 * - detect collisions
 * - if capsule collides with player, player occupies capsule, unless players is already in a capsule
 * - if capsules collide, do nothing
 */

import { CapsuleComponent, CapsuleMove } from "../Component/capsule"
import { PlayerComponent } from "../Component/player"
import { vectorToCanvasCoords } from "../helpers"
import type { PhysicalSystem } from "./physical"


type CollidableComponent = Collidable & Component

interface ComponentGeneric
{
	id: string
	instance: CollidableComponent
}

interface PlayerCapsuleIntersect
{
	capsule: CapsuleComponent
	player: PlayerComponent
	capsuleID: string
	playerID: string
}

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

	// https://www.geeksforgeeks.org/check-two-given-circles-touch-intersect/
	private intersect( x1: number, y1: number, r1: number, x2: number, y2: number, r2: number )
	{
		const distSq = ( x1 - x2 ) * ( x1 - x2 ) + ( y1 - y2 ) * ( y1 - y2 )

		const radSumSq = ( r1 + r2 ) * ( r1 + r2 )

		return !( distSq > radSumSq )
	}

	// intersecting players
	// intersecting capsules
	// intersecting player + capsule

	private whenPlayerCapsuleIntersect( componentA: ComponentGeneric, componentB: ComponentGeneric )
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

			const _pos0 = pos[ c0.id ] || vectorToCanvasCoords( ctx.canvas, this.physicalSystem.pos( c0.id ) )

			if ( !pos[ c0.id ] ) pos[ c0.id ] = _pos0

			for ( let j = i + 1; j < this.components.length; j += 1 )
			{
				const c1 = this.components[ j ]

				const _pos1 = pos[ c1.id ] || vectorToCanvasCoords( ctx.canvas, this.physicalSystem.pos( c1.id ) )

				if ( !pos[ c1.id ] ) pos[ c1.id ] = _pos1

				if ( this.intersect( _pos0.left, _pos0.top, c0.instance.radius, _pos1.left, _pos1.top, c1.instance.radius ) )
				{
					this.collisions.push( [ c0.id, c1.id ] )
				}
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
					if ( player.inCapsule || capsule.occupiedBy || capsule.moving !== CapsuleMove.pre ) return

					player.inCapsule = capsuleID

					capsule.occupiedBy = playerID
				} )
		}
	}

	private isCollidable( component: Component ): component is CollidableComponent
	{
		return `radius` in component
	}

	next( component: ComponentEntity )
	{
		if ( !this.isCollidable( component.instance ) ) return

		this.idMap[ component.id ] = this.components.length 

		this.components.push( {
			id: component.id,
			instance: component.instance
		} )
	}
}
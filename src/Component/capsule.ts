
import { vectorToCanvasCoords } from "../helpers"

/**
 * - render capsule at a given position
 * 	- combining player and capsule when occupied
 * - draw line when button pressed
 * - on button release
 * 	- eject player
 * 	- emit line
 * 	- listen for playing circle position / size
 * - 
 * - 
 */

export enum CapsuleMove
{
	pre = `pre`,
	active = `active`,
	end = `end`,
	sequence = `sequence`
}

export class CapsuleComponent implements Drawable, Capsule
{
	public occupiedBy: string

	private _moving: CapsuleMove

	constructor( public hasSequence: string )
	{
		this._moving = CapsuleMove.pre
		
		this.occupiedBy = ``
	}

	set moving( value: CapsuleMove )
	{
		this._moving = value
	}

	get moving()
	{
		return this._moving
	}

	get radius()
	{
		return 32
	}

	/**
	 * Called in animation loop
	 * Perform rendering and update functions here
	 * @param ctx 
	 * @param vectorToCanvasCoords 
	 */
	public draw( ctx: CanvasRenderingContext2D, pos: Vector ): void
	{
		// TODO: temporary, will remove

		const { left, top } = vectorToCanvasCoords( ctx.canvas, pos )

		ctx.strokeStyle = `#902`

		ctx.lineWidth = 2

		// circle

		ctx.beginPath()

		ctx.ellipse( left, top, this.radius, this.radius, 0, 0, Math.PI * 2 )

		ctx.stroke()

		ctx.closePath()
	}
}
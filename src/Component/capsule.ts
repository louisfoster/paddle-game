
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

export class CapsuleComponent implements Drawable, Capsule
{
	public moving: boolean

	public occupiedBy: string
	
	public radius: number

	constructor()
	{
		this.moving = false
		
		this.occupiedBy = ``

		this.radius = 30
	}

	/**
	 * Called in animation loop
	 * Perform rendering and update functions here
	 * @param ctx 
	 * @param vectorToCanvasCoords 
	 */
	public draw( ctx: CanvasRenderingContext2D, pos: Vector ): void
	{
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
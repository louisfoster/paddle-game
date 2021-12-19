import { bound } from "../helpers"

export class Player implements Drawable
{
	/**
	 * - position (x: 0 - 1, y: 0 - 1)
	 * - rotation (0 - 1)
	 * - draw (receive ctx, coord translate)
	 * - rotate
	 * - move forward
	 */

	private position: Vector

	private rotation: number

	private acceleration: number

	constructor()
	{
		this.position = { x: 0.5, y: 0.5 }

		// This aligns current rotation with initial draw form
		this.rotation = 0.15

		// this.whRatio = 1

		this.acceleration = 0
	}

	private update( delta: number, ctx: CanvasRenderingContext2D )
	{
		const distance = this.acceleration > 0 ? this.acceleration * ( delta * 0.00001 ) + 0.0001 : 0

		this.acceleration = this.acceleration > 0 ? this.acceleration - ( delta * 0.005 ) : 0

		if ( distance )
		{
			this.position.x =
				bound( distance
				* Math.cos( ( this.rotation * 360 ) * Math.PI / 180 )
				+ this.position.x )

			this.position.y =
				bound( ( distance * ( ctx.canvas.width / ctx.canvas.height ) ) 
				* Math.sin(  ( this.rotation * 360 ) * Math.PI / 180 )
				+ this.position.y )
		}
	}

	/**
	 * Called in animation loop
	 * Perform rendering and update functions here
	 * @param ctx 
	 * @param vectorToCanvasCoords 
	 */
	public draw( delta: number, ctx: CanvasRenderingContext2D, vectorToCanvasCoords: ( vector: Vector ) => CanvasCoords ): void
	{
		this.update( delta, ctx )


		const pos = this.position

		const { left, top } = vectorToCanvasCoords( pos )

		ctx.strokeStyle = `#15F`

		ctx.fillStyle = `#15F`

		ctx.lineWidth = 2

		// circle

		ctx.beginPath()

		ctx.ellipse( left, top, 20, 20, 0, 0, Math.PI * 2 )

		ctx.stroke()

		ctx.closePath()

		// triangle

		const path = new Path2D()

		path.moveTo( -5, -20 )

		path.lineTo( 5, -20 )

		path.lineTo( 0, 20 )

		path.closePath()

		ctx.setTransform( 1, 0, 0, 1, left, top )

		ctx.rotate( ( this.rotation * 360 - 90 ) * Math.PI / 180 )

		ctx.fill( path )

		ctx.setTransform( 1, 0, 0, 1, 0, 0 )
	}

	/**
	 * Set the rotation for the character
	 * @param value 0 - 1 number
	 */
	public setRotation( value: number ): void
	{
		this.rotation = value
	}

	/**
	 * propel forward
	 * @returns 
	 */
	public moveForward(): void
	{
		this.acceleration = 10
	}
}
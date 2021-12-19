import { vectorToCanvasCoords } from "../helpers"

export class PlayerComponent implements Drawable, Player
{
	private _rotation: number

	public acceleration: number

	public inCapsule: string

	public radius: number

	constructor()
	{
		// This aligns current rotation with initial draw form
		this._rotation = 0.15

		this.acceleration = 0

		this.inCapsule = ``

		this.radius = 20
	}

	get rotation(): number
	{
		return this._rotation
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

		ctx.strokeStyle = `#15F`

		ctx.fillStyle = `#15F`

		ctx.lineWidth = 2

		// circle

		ctx.beginPath()

		ctx.ellipse( left, top, this.radius, this.radius, 0, 0, Math.PI * 2 )

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
		this._rotation = value
	}

	/**
	 * propel forward
	 * 
	 * TODO: build up energy, further launch
	 * 
	 * @returns 
	 */
	public moveForward(): void
	{
		this.acceleration = 10
	}
}
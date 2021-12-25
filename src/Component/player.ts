import { randomPosition, vectorToCanvasCoords } from "../helpers"

export enum PlayerState
{
	normal = `normal`,
	ejecting = `ejecting`,
	bounce = `bounce`
}

export class PlayerComponent implements Drawable, Player
{
	private _rotation: number

	private color: string

	public acceleration: number

	public inCapsule: string

	public radius: number

	public state: PlayerState

	constructor( public inputID: string, playerCount: number )
	{
		// This aligns current rotation with initial draw form
		this._rotation = 0.15

		this.acceleration = 0

		this.inCapsule = ``

		this.radius = 20

		this.color = `hsl(${70 * playerCount}, 100%, 53%, 1)`

		this.state = PlayerState.normal
	}

	get initialPosition(): Vector
	{
		return randomPosition()
	}

	get rotation(): number
	{
		return this._rotation * 0.001
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

		ctx.strokeStyle = this.color

		ctx.fillStyle = this.color

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

		ctx.rotate( this._rotation * 0.001 - ( Math.PI * 0.5 ) )

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
	 * @returns 
	 */
	public moveForward(): void
	{
		this.acceleration = 10
	}
}
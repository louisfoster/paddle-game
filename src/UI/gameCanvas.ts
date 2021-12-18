import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { el, using } from "../helpers"

interface Vector
{
	x: number
	y: number
}

interface CanvasCoords
{
	left: number
	top: number
}

@define( `game-canvas` )
export class GameCanvas extends ComponentBase
{
	private state: {
		position: Vector
		rotation: number
	}

	private ctx?: CanvasRenderingContext2D

	constructor() 
	{
		super( `game-canvas` )

		this.state = {
			position: {
				x: 0.5,
				y: 0.5
			},
			rotation: 0.15
		}

		document.addEventListener( `keydown`, ( event ) =>
		{
			const key = event.key

			switch( key )
			{
				case `ArrowUp`:
					this.forward()

					break

				case `ArrowLeft`:
					this.setRotation( this.state.rotation - 0.02 )

					break
					
				case `ArrowRight`:
					this.setRotation( this.state.rotation + 0.02 )

					break
			}
		} )
	}

	private init( canvas: HTMLCanvasElement )
	{
		this.ctx = this.getCtx( canvas )

		this.render( this.ctx )
	}

	private getCtx( canvas: HTMLCanvasElement )
	{
		const ctx = canvas.getContext( `2d` )

		if ( !ctx ) throw `No rendering context`

		return ctx
	}

	private render( ctx: CanvasRenderingContext2D )
	{
		const canvas = ctx.canvas

		this.setWH( canvas )

		ctx.fillStyle = `#000`

		ctx.fillRect( 0, 0, canvas.width, canvas.height )

		this.character( ctx )

		requestAnimationFrame( () => this.render( ctx ) )
	}

	private setWH( canvas: HTMLCanvasElement )
	{
		const { width, height } = canvas.getBoundingClientRect()

		if ( canvas.width === width && canvas.height === height ) return

		canvas.width = width

		canvas.height = height
	}

	private character( ctx: CanvasRenderingContext2D )
	{
		const pos = this.state.position

		const { left, top } = this.vectorToCanvasCoords( ctx.canvas, pos )

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

		path.lineTo( -5, -20 )

		path.closePath()

		ctx.setTransform( 1, 0, 0, 1, left, top )

		ctx.rotate( ( this.state.rotation * 360 - 90 ) * Math.PI / 180 )

		ctx.fill( path )

		ctx.setTransform( 1, 0, 0, 1, 0, 0 )
	}

	private randomPosition(): Vector
	{
		return {
			x: Math.random(),
			y: Math.random()
		}
	}

	private vectorToCanvasCoords( canvas: HTMLCanvasElement, vector: Vector ): CanvasCoords
	{
		return {
			left: vector.x * canvas.width,
			top: vector.y * canvas.height
		}
	}

	// range 0 - 1
	public setRotation( value: number )
	{
		this.state.rotation = value
	}

	// new vector
	public forward()
	{
		// need momentum

		if ( !this.ctx ) return

		this.state.position.x =
			0.005 * Math.cos( ( this.state.rotation * 360 ) * Math.PI / 180 ) + this.state.position.x

		this.state.position.y =
			( 0.005 * ( this.ctx.canvas.width / this.ctx.canvas.height ) ) * Math.sin(  ( this.state.rotation * 360 ) * Math.PI / 180 ) + this.state.position.y
	}

	connectedCallback(): void 
	{
		using( this.shadowRoot )
			.do( root => this.init( el( `canvas`, root ) ) )	
	}
}
import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { colors, el, using } from "../helpers"
import { SubscriberHandler } from "../subscriberHandler"



/**
 * - collision: player bouncing off walls, other chars, occupied capsules
 * - capsule drawing, occupying
 * - varying size notes
 * - reset note count for path on resize
 */

@define( `game-canvas` )
export class GameCanvas extends ComponentBase implements UpdateLoopObservable
{
	private state: {
		previousTime: number
	}

	private ctx?: CanvasRenderingContext2D

	public updateLoopObservable: SubscriberHandler<UpdateLoop>

	constructor() 
	{
		super( `game-canvas` )

		this.updateLoopObservable = new SubscriberHandler()

		this.state = {
			previousTime: 0
		}
	}

	private _init( canvas: HTMLCanvasElement )
	{
		this.ctx = this.getCtx( canvas )

		this.state.previousTime = performance.now()

		this.render( this.state.previousTime, this.ctx )
	}

	private getCtx( canvas: HTMLCanvasElement )
	{
		const ctx = canvas.getContext( `2d` )

		if ( !ctx ) throw `No rendering context`

		return ctx
	}

	private render( time: number, ctx: CanvasRenderingContext2D )
	{
		const delta = time - this.state.previousTime

		const canvas = ctx.canvas

		this.setWH( canvas )

		ctx.fillStyle = colors[ `space-cadet` ]

		ctx.fillRect( 0, 0, canvas.width, canvas.height )

		this.updateLoopObservable.next( { delta, ctx } )

		this.state.previousTime = time

		requestAnimationFrame( ( time ) => this.render( time, ctx ) )
	}

	private setWH( canvas: HTMLCanvasElement )
	{
		const { width, height } = canvas.getBoundingClientRect()

		if ( canvas.width === width && canvas.height === height ) return

		canvas.width = width

		canvas.height = height
	}

	public init(): void 
	{
		using( this.shadowRoot )
			.do( root => this._init( el( `canvas`, root ) ) )	
	}
}
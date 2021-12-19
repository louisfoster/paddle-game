import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { bound, el, listen, using } from "../helpers"
import { Synth, PolySynth, Loop, Transport } from "tone"
import { points } from "../points"
import { Player } from "../Component/player"



/**
 * - player tap launch forward
 * 	- opt: build up energy, further launch
 * - player bouncing off walls, other chars, occupied capsules
 * - capsule drawing, occupying
 * - varying size notes
 * - reset note count for path on resize
 */

@define( `game-canvas` )
export class GameCanvas extends ComponentBase
{
	private state: {
		rotation: number
		rotateDirection: number
		circles: boolean[]
		noteIndex: number
		previousTime: number
	}

	private ctx?: CanvasRenderingContext2D

	private player: Player

	constructor() 
	{
		super( `game-canvas` )

		this.player = new Player()

		this.state = {
			rotation: 0.15,
			rotateDirection: 0,
			circles: [],
			noteIndex: 0,
			previousTime: 0
		}

		const ev = listen( document )

		ev.on( `keydown` ).do( ( event ) =>
		{
			const key = event.key

			switch( key )
			{
				case `ArrowLeft`:
					this.state.rotateDirection = -1

					break
					
				case `ArrowRight`:
					this.state.rotateDirection = 1

					break
			}
		} )

		ev.on( `keyup` ).do( ( event ) =>
		{
			const key = event.key

			switch( key )
			{
				case `ArrowUp`:
					this.player.moveForward()

					break

				case `ArrowLeft`:

				case `ArrowRight`:

					this.state.rotateDirection = 0

					break
			}
		} )
		// do sound

		/*
		//create a synth and connect it to the main output (your speakers)
		// const synth = new PolySynth( Synth ).toDestination()

		let capture = false

		ev.on( `mousedown` ).do( () =>
		{
			capture = true


			// https://tonejs.github.io/docs/14.7.77/Transport.html

			// const now = _now()

			// synth.triggerAttack( `D4`, now )

			// synth.triggerAttack( `F4`, now + 0.5 )

			// synth.triggerAttack( `A4`, now + 1 )

			// synth.triggerAttack( `C5`, now + 1.5 )

			// synth.triggerAttack( `E5`, now + 2 )

			// synth.triggerRelease( [ `D4`, `F4`, `A4`, `C5`, `E5` ], now + 4 )
		} )

		ev.on( `mouseup` ).do( () =>
		{
			capture = false

			// console.log( points )
		} )

		ev.on( `mousemove` ).do( ( event ) =>
		{
			if ( !capture || !this.ctx ) return

			// points.push( {
			// 	x: this.bound( event.clientX / this.ctx.canvas.width ),
			// 	y: this.bound( event.clientY / this.ctx.canvas.height )
			// } )
		} )
		*/

		let loop: Loop

		ev.on( `mousedown` ).do( () =>
		{
			if ( loop !== undefined ) return

			const synth = new PolySynth( Synth ).toDestination()

			const baseNotes = [ `D4`, `F4`, `A4`, `C5`, `E5` ]

			const notes = Array( this.state.circles.length )
				.fill( undefined )
				.map( () => baseNotes[ ~~( baseNotes.length * Math.random() ) ] )

			loop = new Loop( time => 
			{
				if ( this.state.circles[ this.state.noteIndex - 1 ] )
					this.state.circles[ this.state.noteIndex - 1 ] = false
				else if ( this.state.noteIndex === 0 && this.state.circles[ this.state.circles.length - 1 ] )
					this.state.circles[ this.state.circles.length - 1 ] = false

				const note = notes[ this.state.noteIndex % notes.length ]

				this.state.circles[ this.state.noteIndex ] = true

				synth.triggerAttackRelease( note, `16n`, time )

				this.state.noteIndex += 1

				if ( this.state.noteIndex === this.state.circles.length )
					this.state.noteIndex = 0
			}, `16n` ).start( 0 )


			Transport.bpm.rampTo( 120, 1 )

			Transport.start()
		} )
	}

	private init( canvas: HTMLCanvasElement )
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

		ctx.fillStyle = `#000`

		ctx.fillRect( 0, 0, canvas.width, canvas.height )

		this.drawPoints( ctx )

		this.character( delta, ctx )

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

	private character( delta: number, ctx: CanvasRenderingContext2D )
	{
		if ( this.state.rotateDirection !== 0 )
		{
			this.state.rotation = this.state.rotation + ( 0.02 * this.state.rotateDirection )

			this.player.setRotation( this.state.rotation )
		}

		this.player.draw( delta, ctx, vector => this.vectorToCanvasCoords( ctx.canvas, vector ) )
	}

	private drawPoints( ctx: CanvasRenderingContext2D )
	{
		const path = new Path2D()

		const { left, top } = this.vectorToCanvasCoords( ctx.canvas, points[ 0 ] )

		path.moveTo( left, top )

		for ( const point of points.slice( 1 ) )
		{
			const { left, top } = this.vectorToCanvasCoords( ctx.canvas, point )

			path.lineTo( left, top )
		}

		ctx.strokeStyle = `#053`

		ctx.stroke( path )

		this.circles( ctx )
	}

	private circles( ctx: CanvasRenderingContext2D )
	{

		/**
		 * Drawing circles along line
		 * 
		 * - get a point
		 * - get the next point
		 * - traverse 20px along line towards next point
		 * - draw a circle at position
		 * - is next point > 60px from current position?
		 * - if yes continue towards point, first by 20px, then repeat above
		 * - if no, get the point after next, move 20px towards it from current position, then repeat above
		 * 
		 * 
		 */

		ctx.strokeStyle = `#1da`

		ctx.fillStyle = `#3fc`

		const currentPosition = points[ 0 ]

		let nextPointIndex = 1

		let run = true

		let p0 = this.vectorToCanvasCoords( ctx.canvas, currentPosition )

		let p1 = this.vectorToCanvasCoords( ctx.canvas, points[ nextPointIndex ] )

		let circleIndex = 0

		while ( run )
		{
			const next = this.interpolate( p0, p1, 20 / this.lineDistance( p0, p1 ) )

			ctx.beginPath()
	
			ctx.ellipse( next.left, next.top, 20, 20, 0, 0, Math.PI * 2 )

			ctx.closePath()

			if ( this.state.circles[ circleIndex ] === undefined )
				this.state.circles[ circleIndex ] = false

			if ( this.state.circles[ circleIndex ] )
			{
				ctx.fill()
			}
			else
			{
				ctx.stroke()
			}

			circleIndex += 1
	

			if ( this.lineDistance( next, p1 ) < 60 )
			{
				// exit condition
				if ( nextPointIndex === points.length - 1 )
				{
					run = false

					break
				}

				nextPointIndex += 1

				// move to next point
				p1 = this.vectorToCanvasCoords( ctx.canvas, points[ nextPointIndex ] )
			}
			
			// continue along line
			p0 = this.interpolate( next, p1, 20 / this.lineDistance( next, p1 ) )
		}
	}

	// https://stackoverflow.com/questions/26540823/find-the-length-of-line-in-canvas
	private lineDistance( point1: CanvasCoords, point2: CanvasCoords )
	{
		return Math.sqrt(
			Math.pow( point2.left - point1.left, 2 ) 
			+ Math.pow( point2.top - point1.top, 2 ) )
	}

	// points A and B, frac between 0 and 1
	// https://stackoverflow.com/questions/17190981/how-can-i-interpolate-between-2-points-when-drawing-with-canvas/17191557
	private interpolate( a: CanvasCoords, b: CanvasCoords, frac: number ): CanvasCoords
	{
		return {
			left: a.left + ( b.left - a.left  ) * frac,
			top: a.top + ( b.top - a.top ) * frac
		}
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

	connectedCallback(): void 
	{
		using( this.shadowRoot )
			.do( root => this.init( el( `canvas`, root ) ) )	
	}
}
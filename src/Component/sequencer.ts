import { vectorToCanvasCoords } from "../helpers"
import { PolySynth, Loop, Transport } from "tone"
import simplify from "simplify-js"

/**
 * - on moving capsule, preserve and draw positions
 * - on end moving capsule
 * 	- simplify line
 * 	- create circles
 * 	- create audio player
 * 	- animate circles
 * - update values on resize
 */

interface Observe
{
	pos?: Vector
	build?: CanvasRenderingContext2D
}

export class SequencerComponent implements Drawable, Sequencer, Observer<Observe>
{
	private rawPoints: Vector[]

	private points: Vector[]

	private loop?: Loop

	private circles: {left: number; top: number; active: boolean}[]

	private noteIndex: number

	private building: boolean

	constructor( public fromCapsule: string, private synth: PolySynth )
	{
		this.rawPoints = []

		this.points = []

		this.circles = []

		this.noteIndex = 0

		this.building = false
	}

	private generateCircles( ctx: CanvasRenderingContext2D )
	{
		if ( this.points.length < 2 ) return

		const currentPosition = this.points[ 0 ]

		let nextPointIndex = 1

		let run = true

		let p0 = vectorToCanvasCoords( ctx.canvas, currentPosition )

		let p1 = vectorToCanvasCoords( ctx.canvas, this.points[ nextPointIndex ] )

		let circleIndex = 0

		while ( run )
		{
			const next = this.interpolate( p0, p1, 20 / this.lineDistance( p0, p1 ) )

			if ( this.circles[ circleIndex ] === undefined )
				this.circles[ circleIndex ] = { active: false, top: next.top, left: next.left }

			circleIndex += 1

			if ( this.lineDistance( next, p1 ) < 60 )
			{
				// exit condition
				if ( nextPointIndex === this.points.length - 1 )
				{
					run = false

					break
				}

				nextPointIndex += 1

				// move to next point
				p1 = vectorToCanvasCoords( ctx.canvas, this.points[ nextPointIndex ] )
			}
			
			// continue along line
			p0 = this.interpolate( next, p1, 20 / this.lineDistance( next, p1 ) )
		}
	}

	private drawPoints( ctx: CanvasRenderingContext2D )
	{
		if ( this.rawPoints.length === 0 || this.loop ) return

		const points = this.loop !== undefined ? this.points : this.rawPoints

		const path = new Path2D()

		const { left, top } = vectorToCanvasCoords( ctx.canvas, points[ 0 ] )

		path.moveTo( left, top )

		for ( const point of points.slice( 1 ) )
		{
			const { left, top } = vectorToCanvasCoords( ctx.canvas, point )

			path.lineTo( left, top )
		}

		ctx.strokeStyle = `#053`

		ctx.stroke( path )
	}


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
	private drawCircles( ctx: CanvasRenderingContext2D )
	{
		if ( !this.loop ) return

		ctx.strokeStyle = `#1da`

		ctx.fillStyle = `#3fc`

		for ( const { active, left, top } of this.circles )
		{
			ctx.beginPath()
	
			ctx.ellipse( left, top, 20, 20, 0, 0, Math.PI * 2 )
	
			ctx.closePath()
	
			if ( active )
			{
				ctx.fill()
			}
			else
			{
				ctx.stroke()
			}
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

	private audio()
	{
		if ( this.loop !== undefined ) return

		const baseNotes = [ `D4`, `F4`, `A4`, `C5`, `E5` ]

		const notes = Array( this.circles.length )
			.fill( undefined )
			.map( () => baseNotes[ ~~( baseNotes.length * Math.random() ) ] )

		this.loop = new Loop( time => 
		{
			if ( this.circles[ this.noteIndex - 1 ] )
				this.circles[ this.noteIndex - 1 ].active = false
			else if ( this.noteIndex === 0 && this.circles[ this.circles.length - 1 ] )
				this.circles[ this.circles.length - 1 ].active = false

			const note = notes[ this.noteIndex % notes.length ]

			this.circles[ this.noteIndex ].active = true

			this.synth.triggerAttackRelease( note, `16n`, time )

			this.noteIndex += 1

			if ( this.noteIndex === this.circles.length )
				this.noteIndex = 0
		}, `16n` ).start( 0 )


		Transport.bpm.rampTo( 120, 1 )

		Transport.start()
	}

	/**
	 * Called in animation loop
	 * Perform rendering and update functions here
	 * @param ctx 
	 * @param vectorToCanvasCoords 
	 */
	public draw( ctx: CanvasRenderingContext2D ): void
	{
		this.drawPoints( ctx )

		this.drawCircles( ctx )
	}

	next( { build, pos }: {pos?: Vector; build?: CanvasRenderingContext2D} )
	{
		if ( pos && !this.building ) this.rawPoints.push( { x: pos.x, y: pos.y } )

		if ( build && !this.building && this.rawPoints.length > 0 && this.points.length === 0 )
		{
			this.building = true

			this.points = simplify( this.rawPoints, 0.01, true )

			this.generateCircles( build )

			this.audio()
		}
	}
}
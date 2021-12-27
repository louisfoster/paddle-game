import { canvasCoordsToVector, colors, doTwoCirclesIntersect, interpolate, lineDistance, pickRan, ranIdx, vectorToCanvasCoords } from "../helpers"
import simplify from "simplify-js"
import type { Frequency } from "tone/build/esm/core/type/Units"

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

interface SequencerCircle extends Circle
{
	interval: number
	maxInterval: number
	radius: number
}

export class SequencerComponent implements Drawable, Sequencer, Observer<Observe>
{
	private rawPoints: Vector[]

	private points: Vector[]

	private circles: SequencerCircle[]

	private noteIndex: number

	private building: boolean

	private baseNotes: Frequency[]

	private highNotes: Frequency[]

	private noteLengths: string[]

	private sizes: number[]

	constructor( public fromCapsule: string, private type: SoundType )
	{
		this.rawPoints = []

		this.points = []

		this.circles = []

		this.noteIndex = 0

		this.building = false

		this.baseNotes = [ `D4`, `F4`, `A4`, `C5`, `E5` ]

		this.highNotes = [ `D7`, `F7`, `A7`, `C7`, `E7` ]

		this.noteLengths = [ `16n`, `8n`, `4n`, `2n` ]

		this.sizes = [ 16, 18, 22, 30 ]
	}

	get activeCirclePosition()
	{
		return this.circles.find( c => c.active )
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
			const ran = Math.random()

			const type = this.type === `synth` && ran > 0.96
				? `high`
				: ran > 0.8
					? `silent`
					: `normal`

			// get length of note, to derive size of circle
			const lengthIndex = type === `high`
				? 0
				: ranIdx( this.noteLengths )

			const radius = this.sizes[ lengthIndex ]

			// Find the next point to draw the circle
			const next = interpolate( p0, p1, radius / lineDistance( p0, p1 ) )


			// 4% chance that if synth, then use high note
			// 20% chance that note is silent


			const note = type === `high`
				? pickRan( this.highNotes )
				: type === `silent`
					? ``
					: pickRan( this.baseNotes )

			// create circle, increment the index
			this.circles[ circleIndex++ ] = {
				...canvasCoordsToVector( ctx.canvas, next ),
				active: false,
				length: this.noteLengths[ lengthIndex ],
				note,
				type: this.type,
				interval: 0,
				maxInterval: Math.pow( 2, lengthIndex ),
				radius
			}

			/**
			 * Draw different sized circles until goal point is "inside" a circle,
			 * then get the next point outside of the circle, and repeat
			 */

			while( doTwoCirclesIntersect( p1.left, p1.top, 1, next.left, next.top, radius ) )
			{
				// exit condition
				if ( nextPointIndex++ >= this.points.length - 1 )
				{
					run = false

					break
				}

				// move to next point
				p1 = vectorToCanvasCoords( ctx.canvas, this.points[ nextPointIndex ] )
			}

			if ( !run ) break
			
			// continue along line
			p0 = interpolate( next, p1, radius / lineDistance( next, p1 ) )
		}
	}

	private drawPoints( ctx: CanvasRenderingContext2D )
	{
		if ( this.rawPoints.length === 0 || this.circles.length > 0 ) return

		const points = this.points.length > 0 ? this.points : this.rawPoints

		const path = new Path2D()

		const { left, top } = vectorToCanvasCoords( ctx.canvas, points[ 0 ] )

		path.moveTo( left, top )

		for ( const point of points.slice( 1 ) )
		{
			const { left, top } = vectorToCanvasCoords( ctx.canvas, point )

			path.lineTo( left, top )
		}

		ctx.strokeStyle = colors[ `mint-green` ]

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
		ctx.strokeStyle = colors[ `french-sky-blue` ]

		ctx.fillStyle = colors[ `french-sky-blue` ]

		for ( const { active, radius, ...vector } of this.circles )
		{
			ctx.beginPath()

			const { left, top } = vectorToCanvasCoords( ctx.canvas, vector )
	
			ctx.ellipse( left, top, radius, radius, 0, 0, Math.PI * 2 )
	
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

	public audio(): Circle | undefined
	{
		if ( this.circles.length === 0 ) return

		/**
		 * if active, check interval
		 */

		const prev = this.noteIndex === 0
			? this.circles[ this.circles.length - 1 ]
			: this.circles[ this.noteIndex - 1 ]

		if ( prev && prev.active )
		{
			prev.interval -= 1

			// if a longer note is currently playing
			// don't return a value
			if ( prev.interval > 0 ) return
			else prev.active = false
		}

		const note = this.circles[ this.noteIndex ]

		note.active = true

		note.interval = note.maxInterval

		this.noteIndex = this.noteIndex + 1 === this.circles.length
			? 0
			: this.noteIndex + 1

		return note
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
		}
	}

	public reset()
	{
		this.rawPoints = []

		this.points = []

		this.circles = []

		this.noteIndex = 0

		this.building = false
	}
}
import { Loop, MembraneSynth, PolySynth, Synth, Transport } from "tone"
import type { Frequency } from "tone/build/esm/core/type/Units"

interface SequencerComponent
{
	id: string
	instance: Sequencer
}

export class AudioSystem implements Observer<ComponentEntity>
{
	private components: SequencerComponent[]

	private idMap: Record<string, number>

	constructor()
	{
		this.components = []

		this.idMap = {}
	}

	public init()
	{
		const synth = new PolySynth( Synth, { volume: -8, detune: -1200 } ).toDestination()

		synth.maxPolyphony = 100

		const beat = new PolySynth( MembraneSynth, { volume: -12, detune: -3600 } ).toDestination()

		beat.maxPolyphony = 100

		const times = [ `16n`, `8n`, `4n`, `2n` ]

		const loop = new Loop( time =>
		{
			const notes: {synth: Record<string, Frequency[]>; beat: Record<string, Frequency[]>} = {
				synth: {
					[ times[ 0 ] ]: [],
					[ times[ 1 ] ]: [],
					[ times[ 2 ] ]: [],
					[ times[ 3 ] ]: [],
				},
				beat: {
					[ times[ 0 ] ]: [],
					[ times[ 1 ] ]: [],
					[ times[ 2 ] ]: [],
					[ times[ 3 ] ]: [],
				}
			}

			component:
			for ( let i = 0; i< this.components.length; i += 1 )
			{
				const component = this.components[ i ]

				const f = component.instance.audio()

				/**
				 * - f we have a circle (no circle if note is playing)
				 * - f.note we aren't silent (can't play silence)
				 * - notes/type/length (and higher lengths) don't already contain the note (no double ups)
				 */
				if ( f && f.note )
				{
					const timeIndex = times.findIndex( t => t === f.length )

					for ( let i = 0; i < times.length; i += 1 )
					{
						const z = notes[ f.type ][ times[ i ] ].findIndex( x => x === f.note )

						if ( z > -1 )
						{
							// if note exists at shorter length, remove it
							if ( i < timeIndex ) notes[ f.type ][ times[ i ] ].splice( z, 1 )
							// continue outer loop if note exists at current
							// time length or longer
							else continue component
						}
					}

					notes[ f.type ][ f.length ].push( f.note )
				}
			}

			for ( const len in notes.synth )
			{
				if ( notes.synth[ len ].length > 0 )
					synth.triggerAttackRelease( notes.synth[ len ], len, time + 0.05 )
			}

			for ( const len in notes.beat )
			{
				if ( notes.beat[ len ].length > 0 )
					beat.triggerAttackRelease( notes.beat[ len ], len, time + 0.05 )
			}
		}, `16n` )

		console.log( `init audio loop` )

		loop.start( 0 )

		Transport.bpm.rampTo( 120, 1 )

		Transport.start( `+0.1` )
	}

	private isSequencer( component: ComponentEntity ): component is SequencerComponent
	{
		return `audio` in component.instance
	}

	next( component: ComponentEntity )
	{
		if ( !this.isSequencer( component ) ) return

		this.idMap[ component.id ] = this.components.length 

		this.components.push( {
			id: component.id,
			instance: component.instance
		} )
	}
}
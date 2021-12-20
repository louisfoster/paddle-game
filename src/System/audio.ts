import { listen } from "../helpers"
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

		this.init()
	}

	private init()
	{
		const synth = new PolySynth( Synth, { volume: -8, detune: -1200 } ).toDestination()

		synth.maxPolyphony = 100

		const synth2 = new PolySynth( MembraneSynth, { volume: -12, detune: -3600 } ).toDestination()

		synth2.maxPolyphony = 100

		const loop = new Loop( time =>
		{
			const notes = this.components.reduce<[Frequency[], Frequency[]]>( ( arr, s ) => 
			{
				const f = s.instance.audio()

				const i = Math.round( Math.random() )

				f && !arr[ i ].includes( f ) && arr[ i ].push( f )

				return arr
			}, [ [], [] ] )

			notes[ 0 ].forEach( ( v, i ) => 
			{
				if ( Math.random() > 0.95 )
				{
					const x = String( v )

					notes[ 0 ][ i ] = `${x[ 0 ]}7`
				}
			} )

			synth.triggerAttackRelease( notes[ 0 ], `16n`, time )

			synth2.triggerAttackRelease( notes[ 1 ], `16n`, time )
		}, `16n` )

		// TODO: replace with better initial interaction
		const unsub = listen( document ).on( `click` ).do( () =>
		{
			unsub()

			console.log( `init audio loop` )

			loop.start( 0 )

			Transport.bpm.rampTo( 120, 1 )

			Transport.start()
		} )
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
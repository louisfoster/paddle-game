import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { el, using } from "../helpers"


@define( `player-loader` )
export class PlayerLoader extends ComponentBase
{
	private state?: HTMLParagraphElement

	private color?: HTMLSpanElement

	constructor() 
	{
		super( `player-loader` )
	}

	protected onDefined(): void
	{
		using( this.shadowRoot )
			.do( root =>
			{
				this.color = el( `figure span`, root )

				this.state = el( `[data-state]`, root )
			} )	
	}

	public update( color: string )
	{
		if ( !this.state || !this.color ) return

		this.state.textContent = `Ready!`

		this.color.style.background = color
	}
}
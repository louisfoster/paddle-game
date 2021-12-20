import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { using, el, listen } from "../helpers"
import { SubscriberHandler } from "../subscriberHandler"

@define( `input-select` )
export class InputSelect extends ComponentBase implements InputModeObservable
{
	public inputModeObservable: SubscriberHandler<InputMode>

	constructor() 
	{
		super( `input-select` )

		this.inputModeObservable = new SubscriberHandler()
	}

	private emit( mode: InputMode )
	{
		this.inputModeObservable.next( mode )

		this.remove()
	}

	connectedCallback(): void 
	{
		using( this.shadowRoot )
			.do( root =>
			{
				const k = el( `#keyboard`, root )
     
				listen( k ).on( `click` ).do( () => this.emit( `keyboard` ) )

				const c = el( `#controller`, root )
     
				listen( c ).on( `click` ).do( () => this.emit( `controller` ) )
			} )	
	}
}
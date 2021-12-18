import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"

@define( `view-render` )
export class ViewRender extends ComponentBase implements Observer<AppView>
{
	constructor() 
	{
		super( `view-render` )
	}

	private showView( viewName: string )
	{
		//
	}

	public next( view: AppView )
	{
		this.showView( view )
	}
}
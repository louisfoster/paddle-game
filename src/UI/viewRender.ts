import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"

@define( `view-render` )
export class ViewRender extends ComponentBase
{
	constructor() 
	{
		super( `view-render` )
	}
}
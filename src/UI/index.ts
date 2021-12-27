import "./viewRender"
import "./gameCanvas"
import "./inputSelect"
import "./playerLoader"

/**
 * Imports load the web components
 * This function then initialises the first view
 */
export function loadUI()
{
	const main = document.createElement( `main` )

	main.innerHTML = `
	<view-render>
		<game-canvas></game-canvas>
	</view-render>
	`

	document.body.appendChild( main )
}
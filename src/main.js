import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import CoachMask from '@/components/CoachMask.vue'
export function createApp() {
	const app = createSSRApp(App);
	app.component('CoachMask', CoachMask)
	return {
		app,
	};
}

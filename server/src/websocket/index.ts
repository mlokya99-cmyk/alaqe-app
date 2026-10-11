import { WebSocketHub } from './hub.js';

let hubInstance: WebSocketHub | null = null;

export function setHub(hub: WebSocketHub) {
  hubInstance = hub;
}

export function getHub(): WebSocketHub | null {
  return hubInstance;
}

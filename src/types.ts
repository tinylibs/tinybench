// @types/node doesn't have these types globally, and we don't want to bring "dom" lib for everyone

export type RemoveEventListenerOptionsArgument = Parameters<typeof EventTarget.prototype.removeEventListener>[2];
export type AddEventListenerOptionsArgument = Parameters<typeof EventTarget.prototype.addEventListener>[2];

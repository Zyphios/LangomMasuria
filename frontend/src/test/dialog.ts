export function installDialogTestMethods() {
  const prototype = HTMLDialogElement.prototype;
  const originalShowModal = Object.getOwnPropertyDescriptor(prototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(prototype, 'close');

  Object.defineProperties(prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      }
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      }
    }
  });

  return () => {
    if (originalShowModal) Object.defineProperty(prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(prototype, 'showModal');
    if (originalClose) Object.defineProperty(prototype, 'close', originalClose);
    else Reflect.deleteProperty(prototype, 'close');
  };
}

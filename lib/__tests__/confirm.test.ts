import { Alert, Platform } from 'react-native';
import { confirmThen } from '../confirm';

const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

function setOS(os: typeof Platform.OS) {
  Platform.OS = os;
}

test('on native it asks first and only runs the action when the user confirms', () => {
  setOS('android');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onConfirm = jest.fn();

  confirmThen('¿Salir sin guardar?', 'No se va a registrar esta sesión de 1:11.', 'Salir', onConfirm);

  expect(onConfirm).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledTimes(1);
  const [title, message, buttons] = alert.mock.calls[0];
  expect(title).toBe('¿Salir sin guardar?');
  expect(message).toBe('No se va a registrar esta sesión de 1:11.');
  expect(buttons?.map((b) => [b.text, b.style])).toEqual([
    ['Cancelar', 'cancel'],
    ['Salir', 'destructive'],
  ]);

  // "Cancelar" no hace nada: el resumen sigue abierto.
  buttons?.[0].onPress?.();
  expect(onConfirm).not.toHaveBeenCalled();

  // "Salir" ejecuta la acción.
  buttons?.[1].onPress?.();
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('on web, where Alert is a no-op, it runs the action directly', () => {
  setOS('web');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onConfirm = jest.fn();

  confirmThen('¿Salir sin guardar?', '', 'Salir', onConfirm);

  expect(alert).not.toHaveBeenCalled();
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

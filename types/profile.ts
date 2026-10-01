export interface Profile {
  /** Nombre de pila para saludar; null si la persona no quiso darlo. */
  name: string | null;
  /** Ya vio la bienvenida (la haya completado u omitido). */
  welcomeDone: boolean;
}

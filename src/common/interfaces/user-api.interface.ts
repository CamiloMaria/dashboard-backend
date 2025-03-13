export interface UserLoginResponse {
  error: boolean;
  row: UserLoginData;
  modulos: boolean;
  permisos: boolean;
  empresa: string;
}

export interface UserLoginData {
  id: string;
  usuario: string;
  codigo: string;
  nombre: string;
  apellido: string;
  cargo: string;
  telefono: string;
  email: string;
  id_rol: string | null;
  privilegio: string;
  status: string;
  tienda: string;
  pregunta: string;
  repuesta: string;
  password: string;
  foto: string | null;
  fecha: string;
  uuid: string;
  web: string;
  proveedor: string;
  tipo_user: string;
  rnc: string | null;
  ficha: string | null;
  photo_url: string | null;
  verification_code: string | null;
  question_attemps: string;
  password_attemps: string;
  empresa: string | null;
  tipo_transporte: string | null;
}

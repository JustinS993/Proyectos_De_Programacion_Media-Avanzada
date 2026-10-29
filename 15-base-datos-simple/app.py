import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "",
    "database": "sistema_usuarios",
    "autocommit": True,
}


def conectar_db():
    return mysql.connector.connect(**DB_CONFIG)


def crear_base_y_tabla():
    conn = mysql.connector.connect(
        host="127.0.0.1",
        port=3307,
        user="root",
        password="",
        autocommit=True,
    )
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS sistema_usuarios")
    cursor.execute("USE sistema_usuarios")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            edad INT NOT NULL
        )
        """
    )
    conn.close()


def agregar_usuario(nombre: str, email: str, edad: int) -> None:
    conn = conectar_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO usuarios (nombre, email, edad) VALUES (%s, %s, %s)",
        (nombre, email, edad),
    )
    conn.close()


def listar_usuarios():
    conn = conectar_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, email, edad FROM usuarios ORDER BY id")
    usuarios = cursor.fetchall()
    conn.close()
    return usuarios


def buscar_usuario_por_id(usuario_id: int):
    conn = conectar_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, nombre, email, edad FROM usuarios WHERE id = %s",
        (usuario_id,),
    )
    usuario = cursor.fetchone()
    conn.close()
    return usuario


def actualizar_usuario(usuario_id: int, nombre: str, email: str, edad: int) -> bool:
    conn = conectar_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE usuarios SET nombre = %s, email = %s, edad = %s WHERE id = %s",
        (nombre, email, edad, usuario_id),
    )
    actualizado = cursor.rowcount > 0
    conn.close()
    return actualizado


def eliminar_usuario(usuario_id: int) -> bool:
    conn = conectar_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id = %s", (usuario_id,))
    eliminado = cursor.rowcount > 0
    conn.close()
    return eliminado


def mostrar_menu() -> None:
    print("\n=== Gestor de usuarios (MySQL) ===")
    print("1. Agregar usuario")
    print("2. Ver usuarios")
    print("3. Actualizar usuario")
    print("4. Eliminar usuario")
    print("5. Salir")


def leer_entero(mensaje: str) -> int:
    while True:
        try:
            return int(input(mensaje))
        except ValueError:
            print("Ingrese un número válido.")


def main() -> None:
    try:
        crear_base_y_tabla()
    except Error as exc:
        print(f"No se pudo conectar a MySQL: {exc}")
        print("Asegúrate de que el servidor MySQL local esté ejecutándose en 127.0.0.1:3307")
        return

    while True:
        mostrar_menu()
        opcion = input("Seleccione una opción: ").strip()

        if opcion == "1":
            nombre = input("Nombre: ").strip()
            email = input("Email: ").strip()
            edad = leer_entero("Edad: ")

            if not nombre or not email:
                print("Nombre y email no pueden quedar vacíos.")
                continue

            try:
                agregar_usuario(nombre, email, edad)
                print("Usuario agregado correctamente.")
            except Error as exc:
                print(f"No se pudo guardar el usuario: {exc}")

        elif opcion == "2":
            usuarios = listar_usuarios()
            if not usuarios:
                print("No hay usuarios registrados.")
                continue

            print("\nUsuarios:")
            for usuario in usuarios:
                print(
                    f"ID: {usuario['id']} | Nombre: {usuario['nombre']} | "
                    f"Email: {usuario['email']} | Edad: {usuario['edad']}"
                )

        elif opcion == "3":
            usuario_id = leer_entero("ID del usuario a actualizar: ")
            usuario = buscar_usuario_por_id(usuario_id)
            if usuario is None:
                print("Usuario no encontrado.")
                continue

            nuevo_nombre = input(f"Nuevo nombre ({usuario['nombre']}): ").strip() or usuario["nombre"]
            nuevo_email = input(f"Nuevo email ({usuario['email']}): ").strip() or usuario["email"]
            nueva_edad = input(f"Nueva edad ({usuario['edad']}): ").strip()
            nueva_edad = int(nueva_edad) if nueva_edad else usuario["edad"]

            try:
                actualizado = actualizar_usuario(usuario_id, nuevo_nombre, nuevo_email, nueva_edad)
                if actualizado:
                    print("Usuario actualizado correctamente.")
                else:
                    print("No se pudo actualizar el usuario.")
            except Error as exc:
                print(f"No se pudo actualizar el usuario: {exc}")

        elif opcion == "4":
            usuario_id = leer_entero("ID del usuario a eliminar: ")
            usuario = buscar_usuario_por_id(usuario_id)
            if usuario is None:
                print("Usuario no encontrado.")
                continue

            confirmacion = input(f"¿Seguro que deseas eliminar a {usuario['nombre']}? (s/n): ").lower()
            if confirmacion != "s":
                print("Eliminación cancelada.")
                continue

            try:
                if eliminar_usuario(usuario_id):
                    print("Usuario eliminado.")
                else:
                    print("No se pudo eliminar el usuario.")
            except Error as exc:
                print(f"No se pudo eliminar el usuario: {exc}")

        elif opcion == "5":
            print("¡Hasta luego!")
            break

        else:
            print("Opción inválida. Intente otra vez.")


if __name__ == "__main__":
    main()

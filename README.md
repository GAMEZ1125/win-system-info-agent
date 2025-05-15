# Win System Info Agent

## Descripción
El Win System Info Agent es una aplicación diseñada para recopilar información del sistema y del hardware de dispositivos Windows. Esta información se almacena en una base de datos MySQL para su posterior análisis y gestión.

## Características
- Recopila información del sistema, incluyendo:
  - Nombre del equipo
  - Marca del equipo
  - Modelo del dispositivo
  - Service Tag/Serial Number
  - Procesador
  - RAM
  - Almacenamiento (estado y uso)
  - Sistema operativo
  - OS Service Pack
  - OS CD Key
  - Tipo de dispositivo
  - Último usuario que inició sesión
  - Última hora de arranque

## Estructura del Proyecto
```
win-system-info-agent
├── src
│   ├── main.ts                # Punto de entrada de la aplicación
│   ├── config
│   │   └── database.ts        # Configuración de la base de datos
│   ├── models
│   │   └── device-info.ts     # Modelo de datos para la información del dispositivo
│   ├── services
│   │   ├── system-info.ts     # Funciones para obtener información del sistema
│   │   ├── hardware-info.ts    # Funciones para obtener información del hardware
│   │   └── database.ts         # Funciones para interactuar con la base de datos
│   └── utils
│       ├── logger.ts          # Funciones para registrar información y errores
│       └── error-handler.ts    # Manejo de errores
├── resources
│   └── installer
│       ├── config.iss         # Script de configuración para el instalador
│       └── icon.ico           # Icono de la aplicación
├── package.json               # Configuración de npm
├── tsconfig.json              # Configuración de TypeScript
├── README.md                  # Documentación del proyecto
└── .gitignore                 # Archivos y carpetas a ignorar por el control de versiones
```

## Instalación
1. Clona el repositorio en tu máquina local.
2. Navega al directorio del proyecto.
3. Ejecuta `npm install` para instalar las dependencias.
4. Configura la conexión a la base de datos en `src/config/database.ts`.
5. Compila el proyecto utilizando TypeScript.
6. Ejecuta el agente con `node dist/main.js`.

## Uso
Una vez que el agente esté en ejecución, comenzará a recopilar información del sistema y la almacenará en la base de datos configurada. Asegúrate de que la base de datos esté en funcionamiento y accesible desde la máquina donde se ejecuta el agente.

## Contribuciones
Las contribuciones son bienvenidas. Si deseas contribuir, por favor abre un issue o un pull request en el repositorio.

## Licencia
Este proyecto está bajo la Licencia MIT.
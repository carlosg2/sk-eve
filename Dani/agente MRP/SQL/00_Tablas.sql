
SET DATEFIRST 7
SET ANSI_NULLS OFF
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET LOCK_TIMEOUT -1
SET QUOTED_IDENTIFIER OFF 
GO


/****** ArtCentroTemp  ******/
if not exists(select * from SysTabla where SysTabla = 'ArtCentroTemp')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ArtCentroTemp','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ArtCentroTemp') and type = 'U')
CREATE TABLE dbo.ArtCentroTemp (
   Usuario varchar(10) NOT NULL,
 Articulo varchar(20) NOT NULL,
 Centro varchar(10) NULL,
 Concepto varchar(50) NULL,
 Cliente varchar(10) NULL,
 Programa varchar(50) NULL
)

/****** ArtFamFC  ******/
if not exists(select * from SysTabla where SysTabla = 'ArtFamFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ArtFamFC','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.ArtFamFC') and type = 'U')
CREATE TABLE dbo.ArtFamFC (
   Familia char(50) NOT NULL
,CONSTRAINT priArtFamFC PRIMARY KEY CLUSTERED (Familia ASC)
)

/****** ArtVarFC  ******/
if not exists(select * from SysTabla where SysTabla = 'ArtVarFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ArtVarFC','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.ArtVarFC') and type = 'U')
CREATE TABLE dbo.ArtVarFC (
   Variedad char(50) NOT NULL
,CONSTRAINT priArtVarFC PRIMARY KEY CLUSTERED (Variedad ASC)
)

/****** CentroFC  ******/
if not exists(select * from SysTabla where SysTabla = 'CentroFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('CentroFC','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.CentroFC') and type = 'U')
CREATE TABLE dbo.CentroFC (
   Centro varchar(10) NOT NULL,
 Descripcion varchar(100) NOT NULL,
 Estatus varchar(15) NOT NULL,
 DiasHabilies float NULL,
 DiasTiempoExtra float NULL,
 HorasDia float NULL,
 Eficiencia float NULL,
 Tipo varchar(30) NULL,
 Forecast bit NULL DEFAULT ((0))
,CONSTRAINT priCentroFC PRIMARY KEY CLUSTERED (Centro ASC)
)

/****** CentroFCTemp  ******/
if not exists(select * from SysTabla where SysTabla = 'CentroFCTemp')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('CentroFCTemp','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.CentroFCTemp') and type = 'U')
CREATE TABLE dbo.CentroFCTemp (
   Usuario varchar(10) NOT NULL,
 Centro varchar(10) NOT NULL,
 Descripcion varchar(100) NOT NULL,
 Estatus varchar(15) NOT NULL,
 DiasHabilies float NULL,
 DiasTiempoExtra float NULL,
 HorasDia float NULL,
 Eficiencia float NULL,
 Tipo varchar(30) NULL
,CONSTRAINT priCentroFCTemp PRIMARY KEY CLUSTERED (Centro ASC)
)

/****** EstacionTFC  ******/
if not exists(select * from SysTabla where SysTabla = 'EstacionTFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('EstacionTFC','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.EstacionTFC') and type = 'U')
CREATE TABLE dbo.EstacionTFC (
   Estacion varchar(10) NOT NULL,
 Centro varchar(10) NOT NULL,
 Descripcion varchar(100) NOT NULL,
 Estatus varchar(15) NOT NULL,
 BolsasxMinutos float NULL,
 TiempoLimpieza float NULL,
 TiempoComida float NULL,
 TiempoCambiosBobina float NULL,
 TiempoCambioEnfardadora float NULL,
 CapacidadtnHora float NULL,
 CambioMallas float NULL,
 Turnos float NULL,
 HorasTurnos float NULL,
 CambiosBolsaPresentacion float NULL,
 CambiosVariedad float NULL,
 CapDiaCr float NULL
,CONSTRAINT priEstacionTFC PRIMARY KEY CLUSTERED (Estacion ASC)
)

/****** EstacionTFCTemp  ******/
if not exists(select * from SysTabla where SysTabla = 'EstacionTFCTemp')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('EstacionTFCTemp','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.EstacionTFCTemp') and type = 'U')
CREATE TABLE dbo.EstacionTFCTemp (
   Usuario varchar(10) NOT NULL,
 Estacion varchar(10) NOT NULL,
 Centro varchar(10) NOT NULL,
 Descripcion varchar(100) NOT NULL,
 Estatus varchar(15) NOT NULL,
 BolsasxMinutos float NULL,
 TiempoLimpieza float NULL,
 TiempoComida float NULL,
 TiempoCambiosBobina float NULL,
 TiempoCambioEnfardadora float NULL,
 CapacidadtnHora float NULL,
 CambioMallas float NULL,
 Turnos float NULL,
 HorasTurnos float NULL,
 CambiosBolsaPresentacion float NULL,
 CambiosVariedad float NULL,
 CapDiaCr float NULL
,CONSTRAINT priEstacionTFCTemp PRIMARY KEY CLUSTERED (Estacion ASC)
)

/****** ExplocionMatCF  ******/
if not exists(select * from SysTabla where SysTabla = 'ExplocionMatCF')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ExplocionMatCF','Cuenta')
if not exists (select * from sysobjects where id = object_id('dbo.ExplocionMatCF') and type = 'U')
CREATE TABLE dbo.ExplocionMatCF (
   ArticuloPadre varchar(35) NULL,
 DescripcionP varchar(250) NULL,
 ArticuloHijo varchar(35) NULL,
 DescripcionH varchar(250) NULL,
 Total float NOT NULL DEFAULT ((0)),
 Produciendo float NOT NULL DEFAULT ((0)),
 BobinaXConsumir float NOT NULL DEFAULT ((0)),
 Venta float NOT NULL DEFAULT ((0)),
 PorVenta float NOT NULL DEFAULT ((0)),
 InventarioP float NOT NULL DEFAULT ((0)),
 DOH int NOT NULL DEFAULT ((0)),
 Objetivo float NOT NULL DEFAULT ((0)),
 Planear float NOT NULL DEFAULT ((0)),
 rendimiento float NOT NULL DEFAULT ((0)),
 InvH float NOT NULL DEFAULT ((0)),
 InvRequerido float NOT NULL DEFAULT ((0)),
 InvFinal float NOT NULL DEFAULT ((0)),
 Cubre varchar(35) NOT NULL DEFAULT ((0)),
 Bandera int NOT NULL DEFAULT ((0)),
 Articulo varchar(35) NULL,
 PorAlcance float NOT NULL DEFAULT ((0)),
 AlcanceDias float NOT NULL DEFAULT ((0))
)

/****** ForecastAyuda  ******/
if not exists(select * from SysTabla where SysTabla = 'ForecastAyuda')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ForecastAyuda','N/A')
if not exists (select * from sysobjects where id = object_id('dbo.ForecastAyuda') and type = 'U')
CREATE TABLE dbo.ForecastAyuda (
   Usuario varchar(50) NOT NULL,
 ID int IDENTITY(1,1) NOT NULL,
 Fecha datetime NULL,
 Proceso varchar(50) NULL,
 Pregunta varchar(100) NULL,
 Respuesta varchar(max) NULL
,CONSTRAINT priForecastAyuda PRIMARY KEY CLUSTERED (ID ASC)
)

/****** ForecastHist  ******/
if not exists(select * from SysTabla where SysTabla = 'ForecastHist')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ForecastHist','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ForecastHist') and type = 'U')
CREATE TABLE dbo.ForecastHist (
   ID int IDENTITY(1,1) NOT NULL,
 Empresa varchar(5) NOT NULL,
 FechaEmision datetime NULL,
 UltimoCambio datetime NULL,
 Ejercicio int NULL,
 Periodo int NULL,
 Usuario varchar(10) NULL
,CONSTRAINT priForecastHist PRIMARY KEY CLUSTERED (ID ASC)
)

/****** ForecastPlanSemanal  ******/
if not exists(select * from SysTabla where SysTabla = 'ForecastPlanSemanal')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ForecastPlanSemanal','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ForecastPlanSemanal') and type = 'U')
CREATE TABLE dbo.ForecastPlanSemanal (
   ID int IDENTITY(1,1) NOT NULL,
 Empresa varchar(5) NOT NULL,
 FechaEmision datetime NULL,
 UltimoCambio datetime NULL,
 Ejercicio int NULL,
 Periodo int NULL,
 Semana int NULL,
 CentroTrabajo varchar(10) NULL,
 Usuario varchar(10) NULL,
 Situacion varchar(50) NULL,
 SituacionFecha datetime NULL,
 SituacionUsuario varchar(10) NULL
,CONSTRAINT priForecastPlanSemanal PRIMARY KEY CLUSTERED (ID ASC)
)

/****** ForecastPlanSemanalD  ******/
if not exists(select * from SysTabla where SysTabla = 'ForecastPlanSemanalD')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ForecastPlanSemanalD','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ForecastPlanSemanalD') and type = 'U')
CREATE TABLE dbo.ForecastPlanSemanalD (
   ID int NOT NULL,
 Renglon int NOT NULL,
 Articulo varchar(20) NULL,
 Lun float NULL,
 Mar float NULL,
 Mie float NULL,
 Jue float NULL,
 Vie float NULL,
 Sab float NULL,
 Dom float NULL,
 Total float NULL
,CONSTRAINT priForecastPlanSemanalD PRIMARY KEY CLUSTERED (ID ASC, Renglon ASC)
)

/****** MovSituacionFC  ******/
if not exists(select * from SysTabla where SysTabla = 'MovSituacionFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('MovSituacionFC','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.MovSituacionFC') and type = 'U')
CREATE TABLE dbo.MovSituacionFC (
   ID int IDENTITY(1,1) NOT NULL,
 Modulo char(5) NOT NULL,
 Mov varchar(20) NOT NULL,
 Orden int NULL,
 Situacion varchar(50) NULL,
 ControlUsuarios bit NOT NULL
,CONSTRAINT priMovSituacionFC PRIMARY KEY CLUSTERED (ID ASC)
)

/****** MovSituacionFCL  ******/
if not exists(select * from SysTabla where SysTabla = 'MovSituacionFCL')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('MovSituacionFCL','Maestro')
if not exists (select * from sysobjects where id = object_id('dbo.MovSituacionFCL') and type = 'U')
CREATE TABLE dbo.MovSituacionFCL (
   Modulo char(5) NOT NULL,
 Mov varchar(20) NOT NULL,
 ID int IDENTITY(1,1) NOT NULL
,CONSTRAINT priMovSituacionFCL PRIMARY KEY CLUSTERED (Modulo ASC, Mov ASC, ID ASC)
)

/****** MovSituacionUsuarioFC  ******/
if not exists(select * from SysTabla where SysTabla = 'MovSituacionUsuarioFC')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('MovSituacionUsuarioFC','Cuenta')
if not exists (select * from sysobjects where id = object_id('dbo.MovSituacionUsuarioFC') and type = 'U')
CREATE TABLE dbo.MovSituacionUsuarioFC (
   ID int NOT NULL,
 Usuario char(10) NOT NULL
,CONSTRAINT priMovSituacionUsuarioFC PRIMARY KEY CLUSTERED (ID ASC, Usuario ASC)
)

/****** ProgramaProdProcesadosA  ******/
if not exists(select * from SysTabla where SysTabla = 'ProgramaProdProcesadosA')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ProgramaProdProcesadosA','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ProgramaProdProcesadosA') and type = 'U')
CREATE TABLE dbo.ProgramaProdProcesadosA (
   Usuario varchar(10) NOT NULL,
 CentroTrabajo varchar(35) NOT NULL,
 Venta money NULL,
 AProducir float NULL,
 TiempoExtra float NULL,
 Ocupacion float NULL,
 PzasLibres float NULL,
 DiasHAbiles int NULL,
 DiasTextra int NULL,
 TVenta money NULL,
 TAProducir float NULL,
 TTiempoExtra float NULL,
 TOcupacion float NULL,
 TPzasLibres float NULL,
 CapacidadHrs float NULL,
 Familia varchar(25) NULL,
 Articulo varchar(25) NULL
)

/****** ProgramaProdSemillasA  ******/
if not exists(select * from SysTabla where SysTabla = 'ProgramaProdSemillasA')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ProgramaProdSemillasA','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ProgramaProdSemillasA') and type = 'U')
CREATE TABLE dbo.ProgramaProdSemillasA (
   Usuario varchar(10) NOT NULL,
 CentroTrabajo varchar(35) NOT NULL,
 Venta money NULL,
 AProducir float NULL,
 TiempoExtra float NULL,
 Ocupacion float NULL,
 PzasLibres float NULL,
 DiasHAbiles int NULL,
 DiasTextra int NULL,
 TVenta money NULL,
 TAProducir float NULL,
 TTiempoExtra float NULL,
 TOcupacion float NULL,
 TPzasLibres float NULL,
 Familia varchar(25) NULL,
 Articulo varchar(25) NULL,
 CapacidadHrs float NULL
)

/****** ResumenPlaneacionCF  ******/
if not exists(select * from SysTabla where SysTabla = 'ResumenPlaneacionCF')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ResumenPlaneacionCF','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ResumenPlaneacionCF') and type = 'U')
CREATE TABLE dbo.ResumenPlaneacionCF (
   ID int IDENTITY(1,1) NOT NULL,
 Usuario varchar(10) NOT NULL,
 Prioridad int NULL,
 CtTrabajo varchar(20) NULL,
 Ejercicio int NULL,
 Concepto varchar(20) NULL,
 Articulo varchar(20) NULL,
 Descripcion varchar(255) NULL,
 Cliente varchar(20) NULL,
 NombreCte varchar(255) NULL,
 Programa varchar(20) NULL,
 S1 float NULL,
 P1 float NULL,
 S2 float NULL,
 P2 float NULL,
 S3 float NULL,
 P3 float NULL,
 S4 float NULL,
 P4 float NULL,
 S5 float NULL,
 P5 float NULL,
 S6 float NULL,
 P6 float NULL,
 S7 float NULL,
 P7 float NULL,
 S8 float NULL,
 P8 float NULL,
 S9 float NULL,
 P9 float NULL,
 S10 float NULL,
 P10 float NULL,
 S11 float NULL,
 P11 float NULL,
 S12 float NULL,
 P12 float NULL,
 S13 float NULL,
 P13 float NULL,
 S14 float NULL,
 P14 float NULL,
 S15 float NULL,
 P15 float NULL,
 S16 float NULL,
 P16 float NULL,
 S17 float NULL,
 P17 float NULL,
 S18 float NULL,
 P18 float NULL,
 S19 float NULL,
 P19 float NULL,
 S20 float NULL,
 P20 float NULL,
 S21 float NULL,
 P21 float NULL,
 S22 float NULL,
 P22 float NULL,
 S23 float NULL,
 P23 float NULL,
 S24 float NULL,
 P24 float NULL,
 S25 float NULL,
 P25 float NULL,
 S26 float NULL,
 P26 float NULL,
 S27 float NULL,
 P27 float NULL,
 S28 float NULL,
 P28 float NULL,
 S29 float NULL,
 P29 float NULL,
 S30 float NULL,
 P30 float NULL,
 S31 float NULL,
 P31 float NULL,
 S32 float NULL,
 P32 float NULL,
 S33 float NULL,
 P33 float NULL,
 S34 float NULL,
 P34 float NULL,
 S35 float NULL,
 P35 float NULL,
 S36 float NULL,
 P36 float NULL,
 S37 float NULL,
 P37 float NULL,
 S38 float NULL,
 P38 float NULL,
 S39 float NULL,
 P39 float NULL,
 S40 float NULL,
 P40 float NULL,
 S41 float NULL,
 P41 float NULL,
 S42 float NULL,
 P42 float NULL,
 S43 float NULL,
 P43 float NULL,
 S44 float NULL,
 P44 float NULL,
 S45 float NULL,
 P45 float NULL,
 S46 float NULL,
 P46 float NULL,
 S47 float NULL,
 P47 float NULL,
 S48 float NULL,
 P48 float NULL,
 S49 float NULL,
 P49 float NULL,
 S50 float NULL,
 P50 float NULL,
 S51 float NULL,
 P51 float NULL,
 S52 float NULL,
 P52 float NULL,
 S53 float NULL,
 P53 float NULL,
 S54 float NULL,
 P54 float NULL,
 Venta float NOT NULL,
 Stock float NOT NULL,
 InvEmp float NOT NULL,
 InvGra float NOT NULL,
 TotalInv float NOT NULL,
 Producir float NOT NULL,
 Gramaje float NOT NULL,
 Kg float NOT NULL,
 Familia varchar(30) NULL,
 FamiliaCF varchar(30) NULL,
 VariedadCF varchar(30) NULL,
 Stok15 float NULL
,CONSTRAINT priResumenPlaneacionCF PRIMARY KEY CLUSTERED (ID ASC, Usuario ASC)
)

/****** ResumenPlaneacionCFHist  ******/
if not exists(select * from SysTabla where SysTabla = 'ResumenPlaneacionCFHist')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('ResumenPlaneacionCFHist','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.ResumenPlaneacionCFHist') and type = 'U')
CREATE TABLE dbo.ResumenPlaneacionCFHist (
   ID int NOT NULL,
 Renglon int NOT NULL,
 Usuario varchar(10) NOT NULL,
 Prioridad int NULL,
 CtTrabajo varchar(20) NULL,
 Ejercicio int NULL,
 Concepto varchar(20) NULL,
 Articulo varchar(20) NULL,
 Descripcion varchar(255) NULL,
 Cliente varchar(20) NULL,
 NombreCte varchar(255) NULL,
 Programa varchar(20) NULL,
 S1 float NULL,
 P1 float NULL,
 S2 float NULL,
 P2 float NULL,
 S3 float NULL,
 P3 float NULL,
 S4 float NULL,
 P4 float NULL,
 S5 float NULL,
 P5 float NULL,
 S6 float NULL,
 P6 float NULL,
 S7 float NULL,
 P7 float NULL,
 S8 float NULL,
 P8 float NULL,
 S9 float NULL,
 P9 float NULL,
 S10 float NULL,
 P10 float NULL,
 S11 float NULL,
 P11 float NULL,
 S12 float NULL,
 P12 float NULL,
 S13 float NULL,
 P13 float NULL,
 S14 float NULL,
 P14 float NULL,
 S15 float NULL,
 P15 float NULL,
 S16 float NULL,
 P16 float NULL,
 S17 float NULL,
 P17 float NULL,
 S18 float NULL,
 P18 float NULL,
 S19 float NULL,
 P19 float NULL,
 S20 float NULL,
 P20 float NULL,
 S21 float NULL,
 P21 float NULL,
 S22 float NULL,
 P22 float NULL,
 S23 float NULL,
 P23 float NULL,
 S24 float NULL,
 P24 float NULL,
 S25 float NULL,
 P25 float NULL,
 S26 float NULL,
 P26 float NULL,
 S27 float NULL,
 P27 float NULL,
 S28 float NULL,
 P28 float NULL,
 S29 float NULL,
 P29 float NULL,
 S30 float NULL,
 P30 float NULL,
 S31 float NULL,
 P31 float NULL,
 S32 float NULL,
 P32 float NULL,
 S33 float NULL,
 P33 float NULL,
 S34 float NULL,
 P34 float NULL,
 S35 float NULL,
 P35 float NULL,
 S36 float NULL,
 P36 float NULL,
 S37 float NULL,
 P37 float NULL,
 S38 float NULL,
 P38 float NULL,
 S39 float NULL,
 P39 float NULL,
 S40 float NULL,
 P40 float NULL,
 S41 float NULL,
 P41 float NULL,
 S42 float NULL,
 P42 float NULL,
 S43 float NULL,
 P43 float NULL,
 S44 float NULL,
 P44 float NULL,
 S45 float NULL,
 P45 float NULL,
 S46 float NULL,
 P46 float NULL,
 S47 float NULL,
 P47 float NULL,
 S48 float NULL,
 P48 float NULL,
 S49 float NULL,
 P49 float NULL,
 S50 float NULL,
 P50 float NULL,
 S51 float NULL,
 P51 float NULL,
 S52 float NULL,
 P52 float NULL,
 S53 float NULL,
 P53 float NULL,
 S54 float NULL,
 P54 float NULL,
 Venta float NULL,
 Stock float NULL,
 InvEmp float NULL,
 InvGra float NULL,
 TotalInv float NULL,
 Producir float NULL,
 Gramaje float NULL,
 Kg float NULL,
 Familia varchar(30) NULL,
 FamiliaCF varchar(30) NULL,
 VariedadCF varchar(30) NULL,
 Stok15 float NULL
,CONSTRAINT priResumenPlaneacionCFHist PRIMARY KEY CLUSTERED (ID ASC, Renglon ASC)
)

/****** WebInicio  ******/
if not exists(select * from SysTabla where SysTabla = 'WebInicio')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('WebInicio','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.WebInicio') and type = 'U')
CREATE TABLE dbo.WebInicio (
   Usuario varchar(10) NOT NULL,
 CentroTrabajo varchar(35) NOT NULL,
 Venta money NULL,
 AProducir float NULL,
 TiempoExtra float NULL,
 Ocupacion float NULL,
 PzasLibres float NULL,
 DiasHAbiles int NULL,
 DiasTextra int NULL,
 CapacidadHrs float NULL,
 HorasProgram float NULL,
 PorOcupacion float NULL,
 Maq1 float NULL,
 Maq2 float NULL,
 Familia varchar(25) NULL,
 centro varchar(50) NULL
)

/****** WebInicioHist  ******/
if not exists(select * from SysTabla where SysTabla = 'WebInicioHist')
 INSERT INTO SysTabla (SysTabla,Tipo) VALUES ('WebInicioHist','Movimiento')
if not exists (select * from sysobjects where id = object_id('dbo.WebInicioHist') and type = 'U')
CREATE TABLE dbo.WebInicioHist (
   ID int NOT NULL,
 CentroTrabajo varchar(35) NOT NULL,
 Venta money NULL,
 AProducir float NULL,
 TiempoExtra float NULL,
 Ocupacion float NULL,
 PzasLibres float NULL,
 DiasHAbiles int NULL,
 DiasTextra int NULL,
 CapacidadHrs float NULL,
 HorasProgram float NULL,
 PorOcupacion float NULL,
 Maq1 float NULL,
 Maq2 float NULL,
 Familia varchar(25) NULL,
 centro varchar(50) NULL
)


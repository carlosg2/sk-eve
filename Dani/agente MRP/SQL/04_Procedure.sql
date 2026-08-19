

SET DATEFIRST 7
SET ANSI_NULLS OFF
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET LOCK_TIMEOUT -1
SET QUOTED_IDENTIFIER OFF
GO
/**************** fnWebVentaFechasAcumArticulo ****************/
if exists (select * from sysobjects where name = 'fnWebVentaFechasAcumArticulo' and type = 'FN') DROP FUNCTION fnWebVentaFechasAcumArticulo
GO
CREATE FUNCTION fnWebVentaFechasAcumArticulo (@Empresa char(5), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)      
RETURNS float      
AS  BEGIN      
DECLARE       
@Resultado float 
  SELECT @Resultado = ROUND(SUM(CASE WHEN MovTipo.Clave = 'VTAS.F' THEN  ISNULL(VentaTCalc.CantidadNeta,0.00) 
                                                                   ELSE -ISNULL(VentaTCalc.CantidadNeta,0.00) END),0)  
   FROM VentaTCalc     
   JOIN MovTipo ON VentaTCalc.Mov = MovTipo.Mov     
   WHERE VentaTCalc.Empresa = @Empresa    
    AND VentaTCalc.FechaEmision BETWEEN @FechaD AND @FechaA    
  AND MovTipo.Clave IN ('VTAS.F', 'VTAS.D')     
  AND VentaTCalc.Estatus = 'CONCLUIDO'    
  AND VentaTCalc.Articulo = @Articulo    
  AND MovTipo.Modulo = 'VTAS'  
   RETURN(@Resultado)        
END 
GO

/**************** fnFCPresupuestoSemana ****************/
if exists (select * from sysobjects where name = 'fnFCPresupuestoSemana' and type = 'FN') DROP FUNCTION fnFCPresupuestoSemana
GO
CREATE FUNCTION dbo.fnFCPresupuestoSemana (@Ejercicio int,  @Mes int,  @Semana int, @Importe float )
RETURNS float 
AS BEGIN  
DECLARE   
@Resultado float
IF EXISTS(SELECT * 
            FROM DBO.DIM_TIEMPO_SEMANA 
            WHERE DIM_TIEMPO_SEMANA.Año    = @Ejercicio  
     AND DIM_TIEMPO_SEMANA.Mes    = @Mes
     AND DIM_TIEMPO_SEMANA.Semana = @Semana) SELECT @Resultado =  @Importe ELSE SELECT @Resultado = NULL  
RETURN(@Resultado) 
END 
GO

/**************** fnFCCentroTrabajoDefaul ****************/
if exists (select * from sysobjects where name = 'fnFCCentroTrabajoDefaul' and type = 'FN') DROP FUNCTION fnFCCentroTrabajoDefaul
GO
CREATE FUNCTION dbo.fnFCCentroTrabajoDefaul (@Articulo varchar(20))  
RETURNS varchar(10)   
AS BEGIN    
DECLARE     
@Resultado varchar(10)  
SELECT @Resultado = NULL   
  DECLARE crCentro CURSOR  
      FOR SELECT Art.CentroDef 
        FROM Art  
        WHERE Art.Articulo = @Articulo  
   GROUP BY Art.CentroDef    
   ORDER BY Art.CentroDef   ASC  
  OPEN crCentro  
  FETCH NEXT FROM crCentro INTO @Resultado  
  CLOSE crCentro  
  DEALLOCATE crCentro  
RETURN(@Resultado)   
END   
GO

/**************** fnWebProducidoFechasAcumArticulo ****************/
if exists (select * from sysobjects where name = 'fnWebProducidoFechasAcumArticulo' and type = 'FN') DROP FUNCTION fnWebProducidoFechasAcumArticulo
GO
CREATE FUNCTION fnWebProducidoFechasAcumArticulo (@Empresa char(5), @Centro varchar(10), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime) 
RETURNS float      
AS  BEGIN      
DECLARE       
@Resultado float 
  SELECT @Resultado = ROUND(SUM(ISNULL(ProdD.Cantidad,0.00)),2)    
   FROM Prod     
   JOIN MovTipo ON Prod.Mov = MovTipo.Mov     
   JOIN ProdD ON Prod.ID  = ProdD.ID 
   WHERE Prod.Empresa = @Empresa    
    AND Prod.FechaEmision BETWEEN @FechaD AND @FechaA    
  AND MovTipo.Clave IN ('PROD.E')     
  AND Prod.Estatus IN ( 'CONCLUIDO')    
  AND ProdD.Articulo = @Articulo    
  AND ProdD.Centro   = @Centro
  AND MovTipo.Modulo = 'PROD'
   RETURN(@Resultado)        
END 
GO

/**************** fnFCCentroTrabajo ****************/
if exists (select * from sysobjects where name = 'fnFCCentroTrabajo' and type = 'FN') DROP FUNCTION fnFCCentroTrabajo
GO
CREATE FUNCTION dbo.fnFCCentroTrabajo (@Usuario varchar(10), 
                                       @Articulo varchar(20), 
            @Concepto varchar(50), 
            @Cliente  varchar(10), 
            @Programa varchar(50))  
RETURNS varchar(10)   
AS BEGIN    
DECLARE     
@Resultado varchar(10)  
SELECT @Resultado = NULL   
SELECT @Resultado = ArtCentroTemp.Centro   
  FROM ArtCentroTemp   
 WHERE ArtCentroTemp.Usuario  = @Usuario  
  AND  ArtCentroTemp.Articulo = @Articulo 
  AND  ArtCentroTemp.Concepto = @Concepto  
  AND  ArtCentroTemp.Cliente  = @Cliente 
  AND  ArtCentroTemp.Programa = @Programa 
RETURN(@Resultado)   
END
GO

/**************** fnWebVentaAcumArticulo ****************/
if exists (select * from sysobjects where name = 'fnWebVentaAcumArticulo' and type = 'FN') DROP FUNCTION fnWebVentaAcumArticulo
GO
CREATE  FUNCTION fnWebVentaAcumArticulo (@Articulo  varchar(20))      
RETURNS float      
AS  BEGIN      
DECLARE       
@Resultado varchar(50),     
@FechaD    datetime,      
@FechaA    datetime,     
@DiasPeriodo int,     
@Dias      float = 15,     
@Empresa char(5) = 'INCF'     
SELECT @FechaA      = dbo.fnFechaSinHora(GETDATE()),       
       @FechaD      = DATEADD(month, -6, @FechaA),    
    @DiasPeriodo = DATEDIFF(day, @FechaD, @FechaA)     
  SELECT @Resultado = ROUND((SUM(CASE WHEN MovTipo.Clave = 'VTAS.F' THEN ISNULL(VentaTCalc.Cantidad,0.00) ELSE  - ISNULL(VentaTCalc.Cantidad,0.00) END) / @DiasPeriodo) * @Dias,0)    
   FROM VentaTCalc     
   JOIN MovTipo ON VentaTCalc.Mov = MovTipo.Mov     
   WHERE VentaTCalc.Empresa = @Empresa    
     AND VentaTCalc.FechaEmision BETWEEN @FechaD AND @FechaA    
  AND MovTipo.Clave IN ('VTAS.F', 'VTAS.D')     
  AND VentaTCalc.Estatus = 'CONCLUIDO'    
  AND VentaTCalc.Articulo = @Articulo    
  AND MovTipo.Modulo = 'VTAS'    
   RETURN(@Resultado)        
END  
GO

/**************** fnForecastPlanSemanalAcum ****************/
if exists (select * from sysobjects where name = 'fnForecastPlanSemanalAcum' and type = 'FN') DROP FUNCTION fnForecastPlanSemanalAcum
GO
CREATE FUNCTION dbo.fnForecastPlanSemanalAcum (@Ejercicio int, @Periodo int,  @Centro varchar(10), @Articulo varchar(20), @Producir float)      
RETURNS float      
AS  BEGIN      
DECLARE       
@Resultado float 
 SELECT @Resultado = SUM(ISNULL(Lun,0.00) + ISNULL(Mar,0.00) + ISNULL(Mie,0.00) + ISNULL(Jue,0.00) + 
                   ISNULL(Vie,0.00) + ISNULL(Sab,0.00) + ISNULL(Dom,0.00))
   FROM ForecastPlanSemanalD
  JOIN ForecastPlanSemanal ON ForecastPlanSemanalD.ID = ForecastPlanSemanal.ID 
  WHERE 
  ForecastPlanSemanal.Ejercicio = @Ejercicio 
  AND ForecastPlanSemanal.Periodo = @Periodo 
  AND ForecastPlanSemanalD.Articulo = @Articulo --- 'A6124'
     AND ForecastPlanSemanal.CentroTrabajo = @Centro --- 'A6124'
 SELECT @Resultado = ISNULL(@Producir, 0.00) - ISNULL(@Resultado,0.00)
RETURN(@Resultado) 
END 
GO

/**************** fnWebArtMaterialDisponible ****************/
if exists (select * from sysobjects where name = 'fnWebArtMaterialDisponible' and type = 'FN') DROP FUNCTION fnWebArtMaterialDisponible
GO
CREATE FUNCTION fnWebArtMaterialDisponible (@Empresa char(5), @Material  varchar(20))           
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado float           
  SELECT @Resultado = SUM(ISNULL(ArtDisponible.Disponible,0.00))             
     FROM ArtDisponible                              
   WHERE ArtDisponible.Empresa=@Empresa          
   AND ArtDisponible.Articulo = @Material              
   AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)      
   RETURN(@Resultado)                  
END 
GO

/**************** fnSituacionSiguienteFC ****************/
if exists (select * from sysobjects where name = 'fnSituacionSiguienteFC' and type = 'FN') DROP FUNCTION fnSituacionSiguienteFC
GO
CREATE FUNCTION fnSituacionSiguienteFC 
 (
 @Modulo     varchar(5), 
 @Mov     varchar(20),
 @Situacion    varchar(50)
 )
RETURNS varchar(50)
AS BEGIN
  DECLARE
    @Resultado    varchar(50),
    @Orden     int,
    @OrdenSiguiente   int
  SET @Resultado = NULL
  SET @Orden = NULL
  SELECT
    @Orden = Orden
    FROM MovSituacionFC
   WHERE Modulo = @Modulo
     AND Mov = @Mov
     AND Situacion = @Situacion
  IF @Orden IS NOT NULL
  BEGIN
        SET @OrdenSiguiente = NULL
        SELECT @OrdenSiguiente = MIN(Orden) 
          FROM MovSituacionFC
         WHERE Modulo = @Modulo AND Mov = @Mov AND Orden > @Orden
        SELECT @Resultado = MIN(Situacion)
          FROM MovSituacionFC
         WHERE Modulo = @Modulo AND Mov = @Mov  AND  Orden = @OrdenSiguiente
  END
  RETURN (@Resultado)
END
GO

/**************** fnSituacionPermiteAvanzarFC ****************/
if exists (select * from sysobjects where name = 'fnSituacionPermiteAvanzarFC' and type = 'FN') DROP FUNCTION fnSituacionPermiteAvanzarFC
GO
CREATE FUNCTION fnSituacionPermiteAvanzarFC 
 (
 @Modulo     varchar(5), 
 @Mov     varchar(20),
 @Situacion    varchar(50),
 @Usuario    varchar(10)
 )
RETURNS bit
--//WITH ENCRYPTION
AS BEGIN
  DECLARE
    @Resultado    bit,
    @Situaciones   bit,
    @UsuarioConPermiso  bit,
    @ControlUsuarios  bit,
    @ID      int
  SELECT  @Resultado = 0, @Situaciones = 1
  IF @Situaciones = 1
  BEGIN
      SELECT @ControlUsuarios = ISNULL(ControlUsuarios,1), @ID = ID FROM MovSituacionFC WHERE Modulo = @Modulo AND Mov = @Mov  AND Situacion = @Situacion
      IF @ControlUsuarios = 0
      BEGIN
        SET @Resultado = 1    
      END ELSE
      BEGIN
        SET @Resultado = ISNULL((SELECT 1 FROM MovSituacionUsuarioFC WHERE ID = @ID AND Usuario = @Usuario),0)
      END
  END  
  RETURN (@Resultado)
END
GO

/**************** fnWebVentaFechasAcumFactura ****************/
if exists (select * from sysobjects where name = 'fnWebVentaFechasAcumFactura' and type = 'FN') DROP FUNCTION fnWebVentaFechasAcumFactura
GO
CREATE FUNCTION fnWebVentaFechasAcumFactura (@Empresa char(5), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)          
RETURNS float          
AS  BEGIN          
DECLARE           
@Resultado float     
    SELECT  @Resultado = SUM(ISNULL(UV_QV_FILLRATE.CANTIDAD_EMBARCADA,0.00) -  ISNULL(UV_QV_FILLRATE.RECHAZO,0.00))   
  FROM UV_QV_FILLRATE   
  WHERE CONVERT(datetime, UV_QV_FILLRATE.FECHA_REMISION)  BETWEEN @FechaD AND  @FechaA   
  AND UV_QV_FILLRATE.NO_ARTICULO = @Articulo  
   RETURN(@Resultado)            
END 
GO

/**************** fnInvForecastDesglosado ****************/
if exists (select * from sysobjects where name = 'fnInvForecastDesglosado' and type = 'FN') DROP FUNCTION fnInvForecastDesglosado
GO
CREATE FUNCTION fnInvForecastDesglosado (@Usuario varchar(10), @Centro varchar(10))        
RETURNS float        
AS  BEGIN    
DECLARE   
@Resultado  float  
SELECT @Resultado = SUM( ISNULL(BalanceFC.Inventario,0.00))   
  FROM BalanceFC  
  WHERE BalanceFC.Usuario = @Usuario  
    AND BalanceFC.CtTrabajo = @Centro  
   RETURN(@Resultado)          
END 
GO

/**************** fnProducidoSemanalAcumArticulo ****************/
if exists (select * from sysobjects where name = 'fnProducidoSemanalAcumArticulo' and type = 'FN') DROP FUNCTION fnProducidoSemanalAcumArticulo
GO
CREATE FUNCTION fnProducidoSemanalAcumArticulo (@Empresa char(5), @Centro varchar(10), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)     
RETURNS float          
AS  BEGIN          
DECLARE           
@Resultado float     
  SELECT @Resultado = ROUND(SUM(ISNULL(ProdD.Cantidad,0.00)),2)        
   FROM Prod         
   JOIN MovTipo ON Prod.Mov = MovTipo.Mov         
   JOIN ProdD ON Prod.ID  = ProdD.ID     
   WHERE Prod.Empresa = @Empresa        
    AND Prod.FechaEmision BETWEEN @FechaD AND @FechaA        
  AND MovTipo.Clave IN ('PROD.E')         
  AND Prod.Estatus IN ( 'CONCLUIDO')        
  AND ProdD.Articulo = @Articulo        
  AND ProdD.Centro   = @Centro    
  AND MovTipo.Modulo = 'PROD'    
   RETURN(@Resultado)            
END 
GO

/**************** fnWebArribosCoberturaFechas ****************/
if exists (select * from sysobjects where name = 'fnWebArribosCoberturaFechas' and type = 'FN') DROP FUNCTION fnWebArribosCoberturaFechas
GO
 CREATE FUNCTION fnWebArribosCoberturaFechas (@Empresa char(5), @Usuario varchar(10), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)          
RETURNS float          
AS  BEGIN          
DECLARE           
@Resultado float     
        SELECT @Resultado = SUM(CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END)     
        FROM   COMPRA        AS C   WITH (NOLOCK)      
        INNER JOIN COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID      
        ---INNER JOIN ART     AS A   WITH (NOLOCK) ON CD.ARTICULO = A.ARTICULO AND A.TIPO = 'LOTE'      
        INNER JOIN ALM     AS ALM WITH (NOLOCK) ON CD.ALMACEN = ALM.ALMACEN      
        WHERE      
             C.EMPRESA = @Empresa    
        AND  C.ESTATUS IN ('PENDIENTE')      
        AND  C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS')      
        ---AND (C.MONEDA  = 'DOLARES')      
        AND CD.ARTICULO = @Articulo    
        AND CD.FECHAENTREGA BETWEEN  @FechaD AND @FechaA 
 SELECT @Resultado = ISNULL(@Resultado,0.00) + ISNULL(SUM(ISNULL(FCArribos.Cantidad,0.00)),0.00) 
      FROM FCArribos
 WHERE  FCArribos.Articulo = @Articulo    
        AND FCArribos.Fecha BETWEEN  @FechaD AND @FechaA 
  AND FCArribos.Usuario = @Usuario
RETURN(ROUND(ISNULL(@Resultado,0.00),0))     
END      
GO

/**************** fnWebArribosCompraFechas ****************/
if exists (select * from sysobjects where name = 'fnWebArribosCompraFechas' and type = 'FN') DROP FUNCTION fnWebArribosCompraFechas
GO
CREATE FUNCTION fnWebArribosCompraFechas (@Empresa char(5), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)          
RETURNS float          
AS  BEGIN          
DECLARE           
@Resultado float   
        SELECT @Resultado = SUM(CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END)     
        FROM   COMPRA        AS C   WITH (NOLOCK)      
        INNER JOIN COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID      
        ---INNER JOIN ART     AS A   WITH (NOLOCK) ON CD.ARTICULO = A.ARTICULO AND A.TIPO = 'LOTE'      
        INNER JOIN ALM     AS ALM WITH (NOLOCK) ON CD.ALMACEN = ALM.ALMACEN      
        WHERE      
             C.EMPRESA = @Empresa    
        AND  C.ESTATUS IN ('PENDIENTE')      
        AND  C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS')      
        ---AND (C.MONEDA  = 'DOLARES')      
        AND CD.ARTICULO = @Articulo    
        AND CD.FECHAENTREGA BETWEEN  @FechaD AND @FechaA 
  AND YEAR(C.FechaEmision) > 2023
  AND CD.CANTIDADPENDIENTE> 0.00
RETURN(ROUND(ISNULL(@Resultado,0.00),0))     
END 
GO

/**************** fnSituacionSiguientePermiteAvanzar ****************/
if exists (select * from sysobjects where name = 'fnSituacionSiguientePermiteAvanzar' and type = 'FN') DROP FUNCTION fnSituacionSiguientePermiteAvanzar
GO
CREATE FUNCTION fnSituacionSiguientePermiteAvanzar (@Modulo     varchar(5),   
                                                     @Mov     varchar(20),  
                                                     @Situacion    varchar(50),  
                                                     @Usuario    varchar(10))
           
RETURNS bit                 
AS  BEGIN                
DECLARE                 
@Resultado          bit,     
@SiguienteSituacion varchar(50)   
    SELECT @SiguienteSituacion = dbo.fnSituacionSiguienteFC(@Modulo, @Mov, @Situacion)   
    SELECT @Resultado = dbo.fnSituacionPermiteAvanzarFC(@Modulo, @Mov, @SiguienteSituacion, @Usuario) 
RETURN(@Resultado)  
END   
GO

/**************** fnArtDisponibleArribosSub12S ****************/
if exists (select * from sysobjects where name = 'fnArtDisponibleArribosSub12S' and type = 'FN') DROP FUNCTION fnArtDisponibleArribosSub12S
GO
CREATE FUNCTION fnArtDisponibleArribosSub12S  (@Empresa   char(5),
                                               @Usuario   varchar(10),   
                                               @Familia   varchar(50))
           
RETURNS float                 
AS  BEGIN                
DECLARE                 
@Resultado  float 
 SELECT @Resultado = SUM(ISNULL(ArtDisponible.Disponible,0.00)) 
   FROM ArribosSub12S 
   JOIN ArtDisponible ON ArribosSub12S.Articulo = ArtDisponible.Articulo  
  WHERE ArribosSub12S.Usuario = @Usuario
  AND ArtDisponible.Empresa = @Empresa
  AND ArribosSub12S.Familia = @Familia
  AND ArtDisponible.Almacen IN (SELECT Almacen FROM Alm WHERE GranelCF = 1) 
RETURN(@Resultado)  
END   
GO

/**************** fnWebArtFamDisponible ****************/
if exists (select * from sysobjects where name = 'fnWebArtFamDisponible' and type = 'FN') DROP FUNCTION fnWebArtFamDisponible
GO
CREATE FUNCTION fnWebArtFamDisponible (@Empresa char(5), @Familia  varchar(50))           
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado float           
  SELECT @Resultado = SUM(ISNULL(ArtDisponible.Disponible,0.00))             
     FROM ArtDisponible  
  JOIN Art ON ArtDisponible.Articulo = Art.Articulo 
   WHERE ArtDisponible.Empresa=@Empresa          
   AND Art.FamArtCF = @Familia              
    AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1) 
   AND Art.ArribosFC = 1
   AND Art.GranelFC = 0
     SELECT @Resultado = ISNULL(@Resultado,0.00) + ISNULL(SUM(ISNULL(ArtDisponible.Disponible,0.00)),0.00)             
     FROM ArtDisponible  
  JOIN Art ON ArtDisponible.Articulo = Art.Articulo 
   WHERE ArtDisponible.Empresa=@Empresa          
   AND Art.FamArtCF = @Familia              
    AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.GranelCF = 1) 
   AND Art.ArribosFC = 1
   AND Art.GranelFC = 1
   RETURN(ROUND(@Resultado,0))                  
END 
GO

/**************** fnWebArribosArtFechas ****************/
if exists (select * from sysobjects where name = 'fnWebArribosArtFechas' and type = 'FN') DROP FUNCTION fnWebArribosArtFechas
GO
 CREATE FUNCTION fnWebArribosArtFechas (@Empresa char(5), @Usuario varchar(10), @Articulo  varchar(20), @FechaD datetime, @FechaA datetime)                
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado float   
   IF UPPER(@Empresa)  IN ('0', 'NULL', '(TODOS)','', '(ALL)') SELECT @Empresa = NULL
 SELECT @Resultado =  ISNULL(SUM(ISNULL(FCArribos.Cantidad,0.00)),0.00)       
      FROM FCArribos      
       JOIN Art ON FCArribos.Articulo  = Art.Articulo     
     WHERE  ISNULL(FCArribos.Empresa, '') = ISNULL(ISNULL(@Empresa, FCArribos.Empresa), '')
     AND FCArribos.Articulo = @Articulo          
        AND FCArribos.Fecha BETWEEN  @FechaD AND @FechaA       
        AND FCArribos.Usuario = @Usuario        
        AND Art.Estatus = 'ALTA' 
RETURN(ROUND(ISNULL(@Resultado,0.00),0))           
END  
GO

/**************** fnWebArribosArtFamFechas ****************/
if exists (select * from sysobjects where name = 'fnWebArribosArtFamFechas' and type = 'FN') DROP FUNCTION fnWebArribosArtFamFechas
GO
 CREATE FUNCTION fnWebArribosArtFamFechas (@Empresa char(5), @Usuario varchar(10), @Familia  varchar(50), @FechaD datetime, @FechaA datetime)                
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado float          
 SELECT @Resultado =  ISNULL(SUM(ISNULL(FCArribos.Cantidad,0.00)),0.00)       
      FROM FCArribos      
 JOIN Art ON FCArribos.Articulo  = Art.Articulo     
    WHERE  Art.FamArtCF = @Familia          
       AND FCArribos.Fecha BETWEEN  @FechaD AND @FechaA       
        AND FCArribos.Usuario = @Usuario      
      AND Art.ArribosFC = 1     
 -- AND Art.GranelFC = 0    
  AND Art.Estatus = 'ALTA'    
  AND Art.FamArtCF <> 'Insumos'    
  AND FCArribos.Empresa IN ('INCF') 
 SELECT @Resultado =  ISNULL(@Resultado,0.00) + ISNULL(SUM(ISNULL(FCArribos.Cantidad,0.00)),0.00)       
      FROM FCArribos      
 JOIN Art ON FCArribos.Articulo  = ISNULL(NULLIF(RTRIM(Art.ArticuloVaca), ''), Art.Articulo) 
    WHERE  Art.FamArtCF = @Familia          
       AND FCArribos.Fecha BETWEEN  @FechaD AND @FechaA       
        AND FCArribos.Usuario = @Usuario      
      AND Art.ArribosFC = 1     
 -- AND Art.GranelFC = 0    
  AND Art.Estatus = 'ALTA'    
  AND Art.FamArtCF <> 'Insumos'    
  AND FCArribos.Empresa IN ('PDB', 'VACA') 
RETURN(ROUND(ISNULL(@Resultado,0.00),0))           
END  
GO

/**************** fnWebExplocionCapacidad ****************/
if exists (select * from sysobjects where name = 'fnWebExplocionCapacidad' and type = 'FN') DROP FUNCTION fnWebExplocionCapacidad
GO
CREATE FUNCTION fnWebExplocionCapacidad (@Producir float, @InvH  float, @Requerido float)           
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado   float, 
@Porcentaje  float
IF ISNULL(@InvH,0.00)>=ISNULL(@Requerido,0.00) SELECT @Resultado = @Producir ELSE 
  IF ISNULL(@InvH,0.00) <  ISNULL(@Requerido,0.00)
  BEGIN
     SELECT @Porcentaje =  dbo.fnPorcentajeImporte(@Requerido, @InvH) 
     SELECT @Resultado = ROUND(dbo.fnPorcentaje(@Producir, @Porcentaje),0) 
  END     
   RETURN(ISNULL(@Resultado,0))                  
END 
GO

/**************** fnWebCentroHDias ****************/
if exists (select * from sysobjects where name = 'fnWebCentroHDias' and type = 'FN') DROP FUNCTION fnWebCentroHDias
GO
CREATE FUNCTION fnWebCentroHDias (@Centro char(10), @ID  int, @Tipo varchar(10) )           
RETURNS float                
AS  BEGIN                
DECLARE                 
@Resultado float           
       IF @Tipo = 'Habiles' SELECT @Resultado = CentroFCHist.DiasHabilies   FROM CentroFCHist WHERE CentroFCHist.ID = @ID AND CentroFCHist.Centro =  @Centro ELSE 
    IF @Tipo = 'Extra'   SELECT @Resultado = CentroFCHist.DiasTiempoExtra FROM CentroFCHist WHERE CentroFCHist.ID = @ID AND CentroFCHist.Centro =  @Centro 
   RETURN(ISNULL(@Resultado,0))                  
END 
GO

/**************** fnVacaArtFamDisponible ****************/
if exists (select * from sysobjects where name = 'fnVacaArtFamDisponible' and type = 'FN') DROP FUNCTION fnVacaArtFamDisponible
GO
CREATE FUNCTION fnVacaArtFamDisponible (@Empresa char(5), @Familia varchar(50 ))  
RETURNS float
AS BEGIN  
DECLARE 
  @Resultado float
SELECT @Resultado = SUM(ISNULL(ArtDisponible.Disponible,0.00))
      FROM  Art 
     JOIN [192.168.1.11].INTELISIS5000.DBO.Art ArtVaca    WITH (NOLOCK) ON Art.Articulo     = ArtVaca.Articulo  
     JOIN [192.168.1.11].INTELISIS5000.DBO.ArtDisponible  WITH (NOLOCK) ON ArtVaca.Articulo = ArtDisponible.Articulo   
             WHERE  Art.ArribosFC = 1            
  AND Art.Estatus = 'ALTA'      
  AND Art.FamArtCF <> 'Insumos'  
  AND Art.FamArtCF = @Familia                
RETURN(@Resultado)  
END
GO


/**************** fnDim_Tiempo_Semana ****************/
if exists (select * from sysobjects where name = 'fnDim_Tiempo_Semana' and type = 'TF') DROP FUNCTION fnDim_Tiempo_Semana
GO
CREATE FUNCTION dbo.fnDim_Tiempo_Semana (@Ejericio int, @Periodo int)
RETURNS @Tabla TABLE (Semana int, FechaD datetime, FechaA datetime, NoSemanaMes int)
AS BEGIN
INSERT INTO @Tabla (Semana, FechaD, FechaA, NoSemanaMes) 
 SELECT DIM_TIEMPO_SEMANA.SEMANA,  
        DIM_TIEMPO_SEMANA.FECHAINICIO,
     DIM_TIEMPO_SEMANA.FECHAFIN,  
        ROW_NUMBER() OVER (ORDER BY DIM_TIEMPO_SEMANA.SEMANA)
   FROM DIM_TIEMPO_SEMANA 
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejericio  
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo
      ORDER BY DIM_TIEMPO_SEMANA.SEMANA ASC
  RETURN
END
GO

/**************** fnArtForecast ****************/
if exists (select * from sysobjects where name = 'fnArtForecast' and type = 'TF') DROP FUNCTION fnArtForecast
GO
CREATE FUNCTION dbo.fnArtForecast ()
RETURNS @Tabla TABLE (Articulo varchar(20))
AS BEGIN
INSERT INTO @Tabla (Articulo) 
 SELECT DISTINCT VacaPresupuestoVtaConD.Articulo 
  FROM VacaPresupuestoVtaConD 
 JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaCon.ID = VacaPresupuestoVtaConD.ID 
 JOIN Art ON VacaPresupuestoVtaConD.Articulo = Art.Articulo
 WHERE VacaPresupuestoVtaCon.Ejercicio IN (YEAR(GETDATE()))  
  RETURN
END
GO


/**************** ForecastPlanProduccion ****************/
if exists (select * from sysobjects where id = object_id('dbo.ForecastPlanProduccion') and type = 'V') DROP VIEW dbo.ForecastPlanProduccion
GO
CREATE   VIEW DBO.FORECASTPLANPRODUCCION
AS
    SELECT 
         E.ID
     ,E.EJERCICIO
     ,E.PERIODO
     ,E.CENTROTRABAJO
     ,E.SEMANA
     ,E.SITUACION
     ,D.RENGLON
     ,D.ARTICULO
     ,ART.DESCRIPCION1   AS DESCRIPCION
     ,D.LUN
     ,D.MAR
     ,D.MIE
     ,D.JUE
     ,D.VIE
     ,D.SAB
     ,D.DOM
     ,ART.FAMARTCF   AS FAMILIA
     ,ISNULL(D.LUN, 0.00) + 
         ISNULL(D.MAR, 0.00) + 
         ISNULL(D.MIE, 0.00) + 
         ISNULL(D.JUE, 0.00) + 
         ISNULL(D.VIE, 0.00) + 
         ISNULL(D.SAB, 0.00) + 
         ISNULL(D.DOM, 0.00) AS PORPRODUCIR
     ,ISNULL(
         ISNULL(D.LUN, 0.00) + 
         ISNULL(D.MAR, 0.00) + 
         ISNULL(D.MIE, 0.00) + 
         ISNULL(D.JUE, 0.00) + 
         ISNULL(D.VIE, 0.00) + 
         ISNULL(D.SAB, 0.00) + 
         ISNULL(D.DOM, 0.00)
         , 0.00) * 
         ART.GRAMAJEFC          AS KILOS
    FROM DBO.FORECASTPLANSEMANAL    AS E
    JOIN DBO.FORECASTPLANSEMANALD   AS D ON E.ID = D.ID
    JOIN DBO.ART ON D.ARTICULO = ART.ARTICULO
GO



/**************** spGuardarTokenApp ****************/
if exists (select * from sysobjects where id = object_id('dbo.spGuardarTokenApp') and type = 'P') DROP PROCEDURE dbo.spGuardarTokenApp
GO
CREATE PROCEDURE spGuardarTokenApp    
 @Token   varchar(max),    
 @Usuario varchar(50)    
AS    
BEGIN  
DECLARE   
 @Aplicacion NVARCHAR(50) = 'Embarques' ,    
 @Logout bit = 0,    
 @Ok int,   
 @OkRef varchar(255)   
BEGIN TRY    
IF(@Logout = 1)    
BEGIN    
UPDATE PushDispositivos SET Fecha = GETDATE(), Estatus = 'Inactivo'    
WHERE Usuario = @Usuario AND Aplicacion = @Aplicacion    
SELECT @Ok    AS Ok,   
       @OkRef AS OkRef   
RETURN    
END    
DECLARE @TokenActual NVARCHAR(MAX)    
SELECT @TokenActual = [Token]    
FROM PushDispositivos    
WHERE Usuario = @Usuario AND Aplicacion = @Aplicacion    
IF(@TokenActual IS NULL)    
BEGIN    
INSERT INTO PushDispositivos    
VALUES(@Usuario, @Aplicacion, @Token, GETDATE(), 'Activo')    
SET @TokenActual = @Token    
SELECT @Ok    AS Ok,   
       @OkRef AS OkRef   
RETURN    
END    
IF(@TokenActual <> @Token)    
BEGIN    
UPDATE PushDispositivos SET Token = @Token, Fecha = GETDATE(), Estatus = 'Activo'    
WHERE Usuario = @Usuario AND Aplicacion = @Aplicacion    
SELECT @Ok    AS Ok,   
       @OkRef AS OkRef   
RETURN    
END    
IF(@TokenActual = @Token)    
BEGIN    
UPDATE PushDispositivos SET Fecha = GETDATE(), Estatus = 'Activo'    
WHERE Usuario = @Usuario AND Aplicacion = @Aplicacion    
SELECT @Ok    AS Ok,   
       @OkRef AS OkRef     
RETURN    
END    
END TRY    
BEGIN CATCH    
IF ERROR_LINE() IS NOT NULL SELECT @Ok     = ERROR_LINE(),   
                                   @OkRef  = ERROR_MESSAGE()  
END CATCH    
END  
GO

/**************** spWebFCGenerarFaltantes ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebFCGenerarFaltantes') and type = 'P') DROP PROCEDURE dbo.spWebFCGenerarFaltantes
GO
CREATE PROCEDURE spWebFCGenerarFaltantes 
                        @Usuario   varchar(10), 
      @json      varchar(max) 
AS BEGIN
DECLARE 
@Ok       int, 
@OkRef    varchar(255) 
BEGIN TRANSACTION 
/*
 SELECT  
        j.Articulo,                                    
        InventarioRequerido,                 
        DisponibleICF,                 
        InventarioVaca, 
  TraspasoVaca,                 
        InventarioPulses,                 
        TraspasoPulses, 
  Faltante
 FROM OPENJSON ( @json )                              
  WITH (Articulo              varchar(20),                                    
        InventarioRequerido   float,                 
        DisponibleICF         float,                 
        InventarioVaca        float, 
  TraspasoVaca          float,                 
        InventarioPulses      float,                 
        TraspasoPulses        float, 
  Faltante              float) AS j                   
 LEFT OUTER JOIN  Art ON j.Articulo = Art.Articulo     
 WHERE ISNULL(j.Faltante, 0.00) > 0.00     
 */
    IF @Ok IS NULL                                
  BEGIN                                
    COMMIT TRANSACTION                                    
  END ELSE                                
  BEGIN                                
    ROLLBACK TRANSACTION                                
    SELECT @OkRef = ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok                                  
  END                        
 SELECT @Ok AS Ok,                             
        @OkRef  AS OkRef 
RETURN 
END 
GO

/**************** spArtCentroDefaul ****************/
if exists (select * from sysobjects where id = object_id('dbo.spArtCentroDefaul') and type = 'P') DROP PROCEDURE dbo.spArtCentroDefaul
GO
CREATE PROCEDURE [dbo].[spArtCentroDefaul]
           @Usuario   varchar(10),
     @Ejercicio  int
 AS BEGIN
 DELETE ArtCentroTemp WHERE Usuario = @Usuario
 INSERT INTO ArtCentroTemp (Usuario, Articulo, Centro, Concepto, Cliente, Programa) 
 SELECT @Usuario, 
        VacaPresupuestoVtaConD.Articulo, 
     dbo.fnFCCentroTrabajoDefaul(VacaPresupuestoVtaConD.Articulo), 
     VacaPresupuestoVtaConD.Concepto, 
     VacaPresupuestoVtaConD.Cliente, 
     VacaPresupuestoVtaConD.Programa
  FROM VacaPresupuestoVtaConD 
 JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaConD.ID = VacaPresupuestoVtaCon.ID 
  WHERE VacaPresupuestoVtaCon.Ejercicio = @Ejercicio 
   AND VacaPresupuestoVtaCon.Estatus = 'CONCLUIDO'
 GROUP BY VacaPresupuestoVtaConD.Articulo, 
          VacaPresupuestoVtaConD.Concepto, 
       VacaPresupuestoVtaConD.Cliente, 
       VacaPresupuestoVtaConD.Programa
RETURN 
END 
GO

/**************** spWebDesgloseForecast ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebDesgloseForecast') and type = 'P') DROP PROCEDURE dbo.spWebDesgloseForecast
GO
CREATE PROCEDURE spWebDesgloseForecast  
                          @Usuario   varchar(10)
AS BEGIN 
  SELECT 
  ID,
  Usuario,
  Prioridad,
  CtTrabajo,
  Ejercicio,
  Concepto,
  Articulo,
  Descripcion,
  Cliente,
  NombreCte,
  Programa,
  S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,
  S11,S12,S13,S14,S15,S16,S17,S18,S19,S20,
  S21,S22,S23,S24,S25,S26,S27,S28,S29,S30,
  S31,S32,S33,S34,S35,S36,S37,S38,S39,S40,
  S41,S42,S43,S44,S45,S46,S47,S48,S49,S50,
  S51,S52,S53,S54,
  P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,
  P11,P12,P13,P14,P15,P16,P17,P18,P19,P20,
  P21,P22,P23,P24,P25,P26,P27,P28,P29,P30,
  P31,P32,P33,P34,P35,P36,P37,P38,P39,P40,
  P41,P42,P43,P44,P45,P46,P47,P48,P49,P50,
  P51,P52,P53,P54,
  Venta,
  Stock,
  InvEmp,
  InvGra,
  TotalInv,
  Producir,
  Gramaje,
  Kg,
  Familia,
  FamiliaCF,
  VariedadCF,
  Stok15
 FROM 
  ResumenPlaneacionCF
 WHERE 
  ResumenPlaneacionCF.Usuario = @Usuario 
RETURN 
END 
GO

/**************** spWebDesgloseForecastActualizar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebDesgloseForecastActualizar') and type = 'P') DROP PROCEDURE dbo.spWebDesgloseForecastActualizar
GO
CREATE PROCEDURE spWebDesgloseForecastActualizar  
                          @Usuario   varchar(10), 
        @json    varchar(max)
AS BEGIN 
DECLARE 
 @ID   int, 
 @P1   float,  @P2   float,  @P3   float,  @P4   float,  @P5   float,  @P6   float,  @P7   float,  @P8   float,  @P9   float,  @P10  float,
 @P11  float,  @P12  float,  @P13  float,  @P14  float,  @P15  float,  @P16  float,  @P17  float,  @P18  float,  @P19  float,  @P20  float,
 @P21  float,  @P22  float,  @P23  float,  @P24  float,  @P25  float,  @P26  float,  @P27  float,  @P28  float,  @P29  float,  @P30  float,
 @P31  float,  @P32  float,  @P33  float,  @P34  float,  @P35  float,  @P36  float,  @P37  float,  @P38  float,  @P39  float,  @P40  float,
 @P41  float,  @P42  float,  @P43  float,  @P44  float,  @P45  float,  @P46  float,  @P47  float,  @P48  float,  @P49  float,  @P50  float, 
 @P51  float,  @P52  float,  @P53  float,  @P54  float,
 @Ok            int,
 @OkRef         varchar(255) 
 DECLARE crDesgloseFC CURSOR FOR                          
 SELECT j.ID, j.P1,  j.P2,  j.P3,  j.P4,  j.P5,  j.P6,  j.P7,  j.P8,  j.P9,  j.P10, 
              j.P11, j.P12, j.P13, j.P14, j.P15, j.P16, j.P17, j.P18, j.P19, j.P20, 
     j.P21, j.P22, j.P23, j.P24, j.P25, j.P26, j.P27, j.P28, j.P29, j.P30,
     j.P31, j.P32, j.P33, j.P34, j.P35, j.P36, j.P37, j.P38, j.P39, j.P40, 
     j.P41, j.P42, j.P43, j.P44, j.P45, j.P46, j.P47, j.P48, j.P49, j.P50, 
     j.P51, j.P52, j.P53, j.P54
 FROM OPENJSON (@json)                        
  WITH (ID    int,  
  P1   float, P2   float, P3   float, P4   float, P5   float, P6   float, P7   float, P8   float, P9   float, P10  float, 
  P11  float, P12  float, P13  float, P14  float, P15  float, P16  float, P17  float, P18  float, P19  float, P20  float,
  P21  float, P22  float, P23  float, P24  float, P25  float, P26  float, P27  float, P28  float, P29  float, P30  float,
  P31  float, P32  float, P33  float, P34  float, P35  float, P36  float, P37  float, P38  float, P39  float, P40  float,
  P41  float, P42  float, P43  float, P44  float, P45  float, P46  float, P47  float, P48  float, P49  float, P50  float,
  P51  float, P52  float, P53  float, P54  float) AS j 
  OPEN crDesgloseFC                          
  FETCH NEXT FROM crDesgloseFC INTO  @ID, @P1,  @P2,  @P3,  @P4,  @P5,  @P6,  @P7,  @P8,  @P9, @P10, 
         @P11, @P12, @P13, @P14, @P15, @P16, @P17, @P18, @P19, @P20, 
         @P21, @P22, @P23, @P24, @P25, @P26, @P27, @P28, @P29, @P30, 
         @P31, @P32, @P33, @P34, @P35, @P36, @P37, @P38, @P39, @P40, 
         @P41, @P42, @P43, @P44, @P45, @P46, @P47, @P48, @P49, @P50, 
         @P51, @P52, @P53, @P54                 
  WHILE @@FETCH_STATUS <> -1                          
  BEGIN                          
    IF @@FETCH_STATUS <> -2             
    BEGIN 
 UPDATE ResumenPlaneacionCF SET   P1 =  @P1,  P2 =  @P2,  P3 =  @P3,  P4 =  @P4,  P5 =  @P5,  P6 =  @P6,  P7 =  @P7,  P8 =  @P8,  P9 =  @P9, P10 = @P10, 
                                  P11 = @P11, P12 = @P12, P13 = @P13, P14 = @P14, P15 = @P15, P16 = @P16, P17 = @P17, P18 = @P18, P19 = @P19, P20 = @P20, 
          P21 = @P21, P22 = @P22, P23 = @P23, P24 = @P24, P25 = @P25, P26 = @P26, P27 = @P27, P28 = @P28, P29 = @P29, P30 = @P30, 
          P31 = @P31, P32 = @P32, P33 = @P33, P34 = @P34, P35 = @P35, P36 = @P36, P37 = @P37, P38 = @P38, P39 = @P39, P40 = @P40, 
          P41 = @P41, P42 = @P42, P43 = @P43, P44 = @P44, P45 = @P45, P46 = @P46, P47 = @P47, P48 = @P48, P49 = @P49, P50 = @P50, 
          P51 = @P51, P52 = @P52, P53 = @P53, P54 = @P54, 
          Producir = 
         ISNULL(@P1,0)  + ISNULL(@P2,0)  + ISNULL(@P3,0)  + ISNULL(@P4,0)  + ISNULL(@P5,0)  + ISNULL(@P6,0)  + ISNULL(@P7,0)  + ISNULL(@P8,0)  + ISNULL(@P9,0)  + ISNULL(@P10,0) +
         ISNULL(@P11,0) + ISNULL(@P12,0) + ISNULL(@P13,0) + ISNULL(@P14,0) + ISNULL(@P15,0) + ISNULL(@P16,0) + ISNULL(@P17,0) + ISNULL(@P18,0) + ISNULL(@P19,0) + ISNULL(@P20,0) +
         ISNULL(@P21,0) + ISNULL(@P22,0) + ISNULL(@P23,0) + ISNULL(@P24,0) + ISNULL(@P25,0) + ISNULL(@P26,0) + ISNULL(@P27,0) + ISNULL(@P28,0) + ISNULL(@P29,0) + ISNULL(@P30,0) +
         ISNULL(@P31,0) + ISNULL(@P32,0) + ISNULL(@P33,0) + ISNULL(@P34,0) + ISNULL(@P35,0) + ISNULL(@P36,0) + ISNULL(@P37,0) + ISNULL(@P38,0) + ISNULL(@P39,0) + ISNULL(@P40,0) +
         ISNULL(@P41,0) + ISNULL(@P42,0) + ISNULL(@P43,0) + ISNULL(@P44,0) + ISNULL(@P45,0) + ISNULL(@P46,0) + ISNULL(@P47,0) + ISNULL(@P48,0) + ISNULL(@P49,0) + ISNULL(@P50,0) +
         ISNULL(@P51,0) + ISNULL(@P52,0) + ISNULL(@P53,0) + ISNULL(@P54,0), 
         Kg = 
         (ISNULL(@P1,0)  + ISNULL(@P2,0)  + ISNULL(@P3,0)  + ISNULL(@P4,0)  + ISNULL(@P5,0)  + ISNULL(@P6,0)  + ISNULL(@P7,0)  + ISNULL(@P8,0)  + ISNULL(@P9,0)  + ISNULL(@P10,0) +
          ISNULL(@P11,0) + ISNULL(@P12,0) + ISNULL(@P13,0) + ISNULL(@P14,0) + ISNULL(@P15,0) + ISNULL(@P16,0) + ISNULL(@P17,0) + ISNULL(@P18,0) + ISNULL(@P19,0) + ISNULL(@P20,0) +
          ISNULL(@P21,0) + ISNULL(@P22,0) + ISNULL(@P23,0) + ISNULL(@P24,0) + ISNULL(@P25,0) + ISNULL(@P26,0) + ISNULL(@P27,0) + ISNULL(@P28,0) + ISNULL(@P29,0) + ISNULL(@P30,0) +
          ISNULL(@P31,0) + ISNULL(@P32,0) + ISNULL(@P33,0) + ISNULL(@P34,0) + ISNULL(@P35,0) + ISNULL(@P36,0) + ISNULL(@P37,0) + ISNULL(@P38,0) + ISNULL(@P39,0) + ISNULL(@P40,0) +
          ISNULL(@P41,0) + ISNULL(@P42,0) + ISNULL(@P43,0) + ISNULL(@P44,0) + ISNULL(@P45,0) + ISNULL(@P46,0) + ISNULL(@P47,0) + ISNULL(@P48,0) + ISNULL(@P49,0) + ISNULL(@P50,0) +
          ISNULL(@P51,0) + ISNULL(@P52,0) + ISNULL(@P53,0) + ISNULL(@P54,0)) * ISNULL(Gramaje,0.00)
      WHERE ResumenPlaneacionCF.ID = @ID 
    END                          
    FETCH NEXT FROM crDesgloseFC INTO @ID, @P1,  @P2,  @P3,  @P4,  @P5,  @P6,  @P7,  @P8,  @P9, @P10, 
          @P11, @P12, @P13, @P14, @P15, @P16, @P17, @P18, @P19, @P20, 
          @P21, @P22, @P23, @P24, @P25, @P26, @P27, @P28, @P29, @P30, 
          @P31, @P32, @P33, @P34, @P35, @P36, @P37, @P38, @P39, @P40, 
          @P41, @P42, @P43, @P44, @P45, @P46, @P47, @P48, @P49, @P50, 
          @P51, @P52, @P53, @P54  
  END                          
  CLOSE crDesgloseFC                          
  DEALLOCATE crDesgloseFC      
RETURN 
END
GO

/**************** spCFFamiliaLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spCFFamiliaLista') and type = 'P') DROP PROCEDURE dbo.spCFFamiliaLista
GO
CREATE PROCEDURE spCFFamiliaLista  
                     @Usuario     varchar(10)  
AS BEGIN   
SELECT DISTINCT LTRIM(RTRIM(ArtFamFC.Familia)) AS Familia     
 FROM ArtFamFC   
 ORDER BY LTRIM(RTRIM(ArtFamFC.Familia)) ASC   
RETURN   
END   
GO

/**************** CFForecastvsVtas ****************/
if exists (select * from sysobjects where id = object_id('dbo.CFForecastvsVtas') and type = 'P') DROP PROCEDURE dbo.CFForecastvsVtas
GO
CREATE PROCEDURE [dbo].[CFForecastvsVtas]    
                   @Usuario    varchar(10),         
       @Ejercicio  int,        
       @Periodo    int         
AS BEGIN             
DECLARE             
@Ventas  float,             
@Empresa char(5) = 'INCF',             
@FechaD    datetime,             
@FechaA    datetime,             
@FechaTrabajo datetime = DATEADD(month, -2, dbo.fnFechaSinHora(GETDATE())),       
@FechaMD   datetime,       
@FechaMA   datetime       
  SELECT @FechaD = MIN(DIM_TIEMPO_SEMANA.FECHAINICIO),         
         @FechaA = MAX(DIM_TIEMPO_SEMANA.FECHAFIN)         
   FROM DIM_TIEMPO_SEMANA         
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio        
     AND DIM_TIEMPO_SEMANA.Mes = @Periodo        
 EXEC spIntToDateTime 1, @Periodo, @Ejercicio, @FechaMD OUTPUT       
 SELECT @FechaMA = dbo.fnUltimoDiaMes(@FechaMD)       
CREATE TABLE #ForecastvsVtas (                  
        Articulo                 varchar(20) COLLATE Database_Default NULL,                
        CtTrabajo                varchar(10) COLLATE Database_Default NULL,             
  Forecast                 float               NULL,             
  Ventas                   float               NULL,             
  Cumplimiento             float               NULL,              
  Participacion            float               NULL,     
  Inventario                float               NULL)            
 CREATE TABLE #ForecastvsVtasT (               
     Orden                    int NULL,             
        CtTrabajo                varchar(10) COLLATE Database_Default NULL,             
  Forecast                 float               NULL,             
  Ventas                   float               NULL,             
  Cumplimiento             float               NULL,              
  Participacion            float               NULL,     
  DOH                      float               NULL)            
DELETE #ForecastvsVtas            
DELETE #ForecastvsVtasT          
INSERT INTO #ForecastvsVtas ( Articulo,  CtTrabajo, Forecast, Ventas, Inventario)               
 SELECT            
          ResumenPlaneacionCF.Articulo,             
          ResumenPlaneacionCF.CtTrabajo,             
          SUM(ISNULL(S1,0.00)  + ISNULL(S2,0.00)  + ISNULL(S3,0.00)  + ISNULL(S4,0.00)  + ISNULL(S5,0.00) +          
          ISNULL(S6,0.00)  + ISNULL(S7,0.00)  + ISNULL(S8,0.00)  + ISNULL(S9,0.00)  + ISNULL(S10,0.00) +          
          ISNULL(S11,0.00) + ISNULL(S12,0.00) + ISNULL(S13,0.00) + ISNULL(S14,0.00) + ISNULL(S15,0.00) +          
          ISNULL(S16,0.00) + ISNULL(S17,0.00) + ISNULL(S18,0.00) + ISNULL(S19,0.00) + ISNULL(S20,0.00) +          
          ISNULL(S21,0.00) + ISNULL(S22,0.00) + ISNULL(S23,0.00) + ISNULL(S24,0.00) + ISNULL(S25,0.00) +           
          ISNULL(S26,0.00) + ISNULL(S27,0.00) + ISNULL(S28,0.00) + ISNULL(S29,0.00) + ISNULL(S30,0.00) +           
          ISNULL(S31,0.00) + ISNULL(S32,0.00) + ISNULL(S33,0.00) + ISNULL(S34,0.00) + ISNULL(S35,0.00) +           
          ISNULL(S36,0.00) + ISNULL(S37,0.00) + ISNULL(S38,0.00) + ISNULL(S39,0.00) + ISNULL(S40,0.00) +           
          ISNULL(S41,0.00) + ISNULL(S42,0.00) + ISNULL(S43,0.00) + ISNULL(S44,0.00) + ISNULL(S45,0.00) +           
          ISNULL(S46,0.00) + ISNULL(S47,0.00) + ISNULL(S48,0.00) + ISNULL(S49,0.00) + ISNULL(S50,0.00) +           
          ISNULL(S51,0.00) + ISNULL(S52,0.00) + ISNULL(S53,0.00) + ISNULL(S54,0.00)),             
        dbo.fnWebVentaFechasAcumFactura(@Empresa, ResumenPlaneacionCF.Articulo, @FechaMD, @FechaMA),     
        SUM(ISNULL(TotalInv, 0.00))    
  FROM             
        ResumenPlaneacionCF   
WHERE ResumenPlaneacionCF.Usuario = @Usuario   
 GROUP BY Articulo,             
          ResumenPlaneacionCF.CtTrabajo             
   HAVING SUM(ISNULL(S1,0.00)  + ISNULL(S2,0.00)  + ISNULL(S3,0.00)  + ISNULL(S4,0.00)  + ISNULL(S5,0.00) +          
          ISNULL(S6,0.00)  + ISNULL(S7,0.00)  + ISNULL(S8,0.00)  + ISNULL(S9,0.00)  + ISNULL(S10,0.00) +          
          ISNULL(S11,0.00) + ISNULL(S12,0.00) + ISNULL(S13,0.00) + ISNULL(S14,0.00) + ISNULL(S15,0.00) +          
          ISNULL(S16,0.00) + ISNULL(S17,0.00) + ISNULL(S18,0.00) + ISNULL(S19,0.00) + ISNULL(S20,0.00) +          
          ISNULL(S21,0.00) + ISNULL(S22,0.00) + ISNULL(S23,0.00) + ISNULL(S24,0.00) + ISNULL(S25,0.00) +           
          ISNULL(S26,0.00) + ISNULL(S27,0.00) + ISNULL(S28,0.00) + ISNULL(S29,0.00) + ISNULL(S30,0.00) +           
          ISNULL(S31,0.00) + ISNULL(S32,0.00) + ISNULL(S33,0.00) + ISNULL(S34,0.00) + ISNULL(S35,0.00) +           
          ISNULL(S36,0.00) + ISNULL(S37,0.00) + ISNULL(S38,0.00) + ISNULL(S39,0.00) + ISNULL(S40,0.00) +           
          ISNULL(S41,0.00) + ISNULL(S42,0.00) + ISNULL(S43,0.00) + ISNULL(S44,0.00) + ISNULL(S45,0.00) +           
          ISNULL(S46,0.00) + ISNULL(S47,0.00) + ISNULL(S48,0.00) + ISNULL(S49,0.00) + ISNULL(S50,0.00) +           
          ISNULL(S51,0.00) + ISNULL(S52,0.00) + ISNULL(S53,0.00) + ISNULL(S54,0.00)) > 0            
 SELECT  @Ventas = SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) FROM #ForecastvsVtas      
INSERT INTO #ForecastvsVtasT (Orden, CtTrabajo, Forecast, Ventas, Cumplimiento, Participacion, DOH)             
 SELECT 1,             
        #ForecastvsVtas.CtTrabajo,             
         SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)) AS Forecast,              
         SUM(ISNULL(#ForecastvsVtas.Ventas,0.00))   AS Ventas,             
         ROUND(CASE WHEN SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) > 0 THEN SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) / NULLIF(SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)),0) * 100 ELSE 0.00 END ,0),         
         ROUND(CASE WHEN @Ventas > 0.00 THEN (100/ISNULL(@Ventas,0.00)) * SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) ELSE 0.00 END,2),     
   ROUND(SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)) / NULLIF(SUM(ISNULL(#ForecastvsVtas.Inventario,0.00)),0),2)    
 FROM #ForecastvsVtas            
 GROUP BY              
       #ForecastvsVtas.CtTrabajo            
 UNION             
 SELECT 2,             
        'TOTAL',             
        SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)) AS Forecast,              
        SUM(ISNULL(#ForecastvsVtas.Ventas,0.00))   AS Ventas,             
        ROUND(CASE WHEN SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) > 0 THEN SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) / NULLIF(SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)),0) * 100 ELSE 0.00 END ,0),                
        ROUND(CASE WHEN @Ventas > 0.00 THEN (100/ISNULL(@Ventas,0.00)) * SUM(ISNULL(#ForecastvsVtas.Ventas,0.00)) ELSE 0.00 END,2) AS Participacion,     
  ROUND(SUM(ISNULL(#ForecastvsVtas.Forecast,0.00)) / NULLIF(SUM(ISNULL(#ForecastvsVtas.Inventario,0.00)),0) ,2)    
   FROM #ForecastvsVtas      
 SELECT *FROM #ForecastvsVtasT  ORDER BY #ForecastvsVtasT.Orden             
RETURN             
END 
GO

/**************** spFCAsignarBasesDefaul ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCAsignarBasesDefaul') and type = 'P') DROP PROCEDURE dbo.spFCAsignarBasesDefaul
GO
CREATE PROCEDURE spFCAsignarBasesDefaul      
                      @Usuario   varchar(10)
AS BEGIN  
  DELETE CentroFCTemp    WHERE CentroFCTemp.Usuario = @Usuario 
  DELETE EstacionTFCTemp WHERE EstacionTFCTemp.Usuario = @Usuario 
INSERT INTO CentroFCTemp (Usuario, Centro,Descripcion,Estatus,DiasHabilies,DiasTiempoExtra,HorasDia,Eficiencia,Tipo) 
  SELECT @Usuario, 
         CentroFC.Centro,
         CentroFC.Descripcion,
   CentroFC.Estatus,
   CentroFC.DiasHabilies,
   CentroFC.DiasTiempoExtra,
   CentroFC.HorasDia,
   CentroFC.Eficiencia,Tipo  
     FROM CentroFC 
   WHERE CentroFC.Estatus = 'ALTA' 
         AND  CentroFC.Forecast = 1 
INSERT INTO EstacionTFCTemp (Usuario, Estacion,Centro,Descripcion,Estatus,BolsasxMinutos,TiempoLimpieza,TiempoComida,TiempoCambiosBobina,TiempoCambioEnfardadora,CapacidadtnHora,CambioMallas,
                             Turnos,HorasTurnos,CambiosBolsaPresentacion,CambiosVariedad,CapDiaCr)
    SELECT 
       @Usuario, 
    EstacionTFC.Estacion,
    EstacionTFC.Centro,
    EstacionTFC.Descripcion,
    EstacionTFC.Estatus,
    EstacionTFC.BolsasxMinutos,
    EstacionTFC.TiempoLimpieza,
    EstacionTFC.TiempoComida,
    EstacionTFC.TiempoCambiosBobina,
    EstacionTFC.TiempoCambioEnfardadora,
    EstacionTFC.CapacidadtnHora,
    EstacionTFC.CambioMallas,
    EstacionTFC.Turnos,
    EstacionTFC.HorasTurnos,
    EstacionTFC.CambiosBolsaPresentacion,
    EstacionTFC.CambiosVariedad,
    EstacionTFC.CapDiaCr
    FROM 
    EstacionTFC
    JOIN CentroFC ON EstacionTFC.Centro = CentroFC.Centro 
    WHERE 
      CentroFC.Forecast = 1 
    AND EstacionTFC.Estatus = 'ALTA'
RETURN   
END
GO

/**************** spFCActualizarBases ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCActualizarBases') and type = 'P') DROP PROCEDURE dbo.spFCActualizarBases
GO
CREATE PROCEDURE spFCActualizarBases 
  @Usuario         varchar(10), 
  @Centro          varchar(10), 
  @DiasHabiles     float, 
  @DiasTiempoExtra float, 
  @HorasDia        float, 
  @Eficiencia      float, 
  @Json            varchar(max)
  AS BEGIN 
  DECLARE 
 @Estacion                  varchar(10), 
 @Turnos                    float, 
 @HorasTurnos               float, 
 @BolsasxMinutos            float, 
 @TiempoLimpieza            float, 
 @TiempoComida              float, 
 @TiempoCambiosBobina       float, 
 @TiempoCambiosEnfardadora  float, 
 @CambioMallas              float, 
 @CapacidadtnHora           float, 
 @CapDiaCrKg                float, 
 @Ok                        int, 
 @OkRef                     varchar(255) 
BEGIN TRANSACTION
  UPDATE CentroFCTemp SET  CentroFCTemp.DiasHabilies    = @DiasHabiles, 
                           CentroFCTemp.DiasTiempoExtra = @DiasTiempoExtra, 
         CentroFCTemp.HorasDia        = @HorasDia,
         CentroFCTemp.Eficiencia      = @Eficiencia
      WHERE CentroFCTemp.Centro          = @Centro
        AND CentroFCTemp.Usuario        = @Usuario
DECLARE crDetalle CURSOR FOR                                        
 SELECT j.Estacion,
  j.Turnos,
  j.HorasTurnos,
  j.BolsasxMinutos,
  j.TiempoLimpieza,
  j.TiempoComida,
  j.TiempoCambiosBobina,
  j.TiempoCambiosEnfardadora,
  j.CapacidadtnHora,
  j.CambioMallas,
  j.CapDiaCrKg           
 FROM OPENJSON ( @json )                                      
  WITH (Estacion                 varchar(10), 
  Turnos                   float, 
  HorasTurnos              float, 
  BolsasxMinutos           float, 
  TiempoLimpieza           float, 
  TiempoComida             float, 
  TiempoCambiosBobina      float, 
  TiempoCambiosEnfardadora float, 
  CapacidadtnHora          float, 
  CambioMallas             float, 
  CapDiaCrKg               float) As j   
  WHERE j.Estacion IS NOT NULL 
  OPEN crDetalle                                        
  FETCH NEXT FROM crDetalle INTO  @Estacion,@Turnos,@HorasTurnos,@BolsasxMinutos,@TiempoLimpieza,@TiempoComida,@TiempoCambiosBobina,@TiempoCambiosEnfardadora,@CapacidadtnHora,@CambioMallas,@CapDiaCrKg                                   
  WHILE @@FETCH_STATUS <> -1                                        
  BEGIN                                        
    IF @@FETCH_STATUS <> -2  AND @Ok IS NULL                          
    BEGIN  
 UPDATE EstacionTFCTemp SET 
       EstacionTFCTemp.Turnos                    =  @Turnos,
       EstacionTFCTemp.HorasTurnos               =  @HorasTurnos,
       EstacionTFCTemp.BolsasxMinutos            =  @BolsasxMinutos,
       EstacionTFCTemp.TiempoLimpieza            =  @TiempoLimpieza,
       EstacionTFCTemp.TiempoComida              =  @TiempoComida,
       EstacionTFCTemp.TiempoCambiosBobina       =  @TiempoCambiosBobina,
       EstacionTFCTemp.TiempoCambioEnfardadora   =  @TiempoCambiosEnfardadora,
       EstacionTFCTemp.CapacidadtnHora           =  @CapacidadtnHora,
       EstacionTFCTemp.CambioMallas              =  @CambioMallas,
       EstacionTFCTemp.CapDiaCr                  =  @CapDiaCrKg
     WHERE   EstacionTFCTemp.Estacion = @Estacion
     AND     EstacionTFCTemp.Usuario  = @Usuario  
     IF @@ROWCOUNT = 0 SELECT @Ok = 10623   
    END                                        
    FETCH NEXT FROM crDetalle INTO @Estacion,@Turnos,@HorasTurnos,@BolsasxMinutos,@TiempoLimpieza,@TiempoComida,@TiempoCambiosBobina,@TiempoCambiosEnfardadora,@CapacidadtnHora,@CambioMallas,@CapDiaCrKg                         
  END                                        
  CLOSE crDetalle                                        
  DEALLOCATE crDetalle 
     IF @Ok IS NULL                                      
  BEGIN                                 
    COMMIT TRANSACTION                        
  END ELSE                                      
  BEGIN                                      
  ROLLBACK TRANSACTION                                      
    SELECT @OkRef = RTRIM(Descripcion)+' '+ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok                                        
  END                                      
  SELECT @Ok         AS Ok,                                     
         @OkRef      AS OkRef
RETURN 
  END 
GO

/**************** spCFCentroLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spCFCentroLista') and type = 'P') DROP PROCEDURE dbo.spCFCentroLista
GO
CREATE PROCEDURE spCFCentroLista
                     @Usuario     varchar(10)
AS BEGIN 
SELECT LTRIM(RTRIM(CentroFC.Centro))      AS Centro, 
       LTRIM(RTRIM(CentroFC.Descripcion)) AS Descripcion, 
    LTRIM(RTRIM(CentroFC.Tipo))        AS Tipo 
 FROM CentroFC 
 WHERE CentroFC.Estatus  = 'ALTA'
    AND CentroFC.Forecast = 1
 ORDER BY LTRIM(RTRIM(CentroFC.Centro)) ASC 
RETURN 
END 
GO

/**************** spArtCentroBalanceo ****************/
if exists (select * from sysobjects where id = object_id('dbo.spArtCentroBalanceo') and type = 'P') DROP PROCEDURE dbo.spArtCentroBalanceo
GO
CREATE PROCEDURE spArtCentroBalanceo    
           @Usuario   varchar(10),     
     @json      varchar(max)     
AS BEGIN     
DECLARE     
@Articulo  varchar(20),     
@Centro    varchar(10),  
@Concepto  varchar(50),   
@Cliente   varchar(10),   
@Programa  varchar(50),   
@Ok        int,     
@OkRef     varchar(255)     
BEGIN TRANSACTION             
 DECLARE crDetalle CURSOR FOR                                              
 SELECT j.Articulo ,                              
        j.CtTrabajo,   
  j.Concepto,   
  j.Cliente,   
  j.Programa  
 FROM OPENJSON ( @json )                                            
  WITH (Articulo  varchar(20),                                                  
        CtTrabajo    varchar(10),   
  Concepto  varchar(50),   
        Cliente   varchar(10),   
        Programa  varchar(50)) As j      
  OPEN crDetalle                                              
  FETCH NEXT FROM crDetalle INTO @Articulo, @Centro, @Concepto, @Cliente, @Programa                                         
  WHILE @@FETCH_STATUS <> -1                                              
  BEGIN                                              
    IF @@FETCH_STATUS <> -2  AND @Ok IS NULL                                
    BEGIN     
   UPDATE ResumenPlaneacionCF SET ResumenPlaneacionCF.CtTrabajo   = @Centro     
                      WHERE ResumenPlaneacionCF.Articulo = @Articulo   
         AND ResumenPlaneacionCF.Concepto = @Concepto  
      AND ResumenPlaneacionCF.Cliente  = @Cliente  
      AND ResumenPlaneacionCF.Programa = @Programa  
                        AND ResumenPlaneacionCF.Usuario  = @Usuario     
        IF @@ROWCOUNT = 0 SELECT @Ok = 10623   
    END                                              
    FETCH NEXT FROM crDetalle INTO @Articulo, @Centro, @Concepto, @Cliente, @Programa                          
  END                                              
  CLOSE crDetalle                                              
  DEALLOCATE crDetalle       
   IF @Ok IS NULL                                            
  BEGIN                                           
    COMMIT TRANSACTION                              
  END ELSE                                            
  BEGIN                                            
  ROLLBACK TRANSACTION                                            
    SELECT @OkRef = RTRIM(Descripcion)+' '+ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok                                              
  END                                            
  SELECT @Ok         AS Ok,                                           
         @OkRef      AS OkRef      
RETURN     
END     
GO

/**************** spFCPPSemanaLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCPPSemanaLista') and type = 'P') DROP PROCEDURE dbo.spFCPPSemanaLista
GO
CREATE PROCEDURE [dbo].[spFCPPSemanaLista] 
     @Usuario varchar(10)
    ,@Ejericio int
    ,@Periodo int
AS
    BEGIN
        --<MGOMEZ|2025.06.20|LOG USO / INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spFCPPSemanaLista'
            ,'@Usuario: ' +   ISNULL(@Usuario, 'NULL') + 
             ', @Ejericio:' + ISNULL(CAST(@Ejericio AS VARCHAR), 'NULL') + 
             ', @Periodo:' +  ISNULL(CAST(@Periodo  AS VARCHAR), 'NULL'));
        --<MGOMEZ|2025.06.20|LOG USO / FIN>
     SELECT 
             Semana
         ,FechaD
         ,FechaA
     FROM dbo.fnDim_Tiempo_Semana(@Ejericio, @Periodo)
     ORDER BY Semana
     RETURN
    END
GO

/**************** spWebCompraArtCostoInfo ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebCompraArtCostoInfo') and type = 'P') DROP PROCEDURE dbo.spWebCompraArtCostoInfo
GO
  CREATE PROCEDURE spWebCompraArtCostoInfo
                       @Familia  varchar(50) 
AS BEGIN 
DECLARE 
@Empresa char(5) = 'INCF',
@FechaA  datetime  = dbo.fnFechaSinHOra(GETDATE()), 
@FechaD  datetime  = DATEADD(year, -1, dbo.fnFechaSinHOra(GETDATE()))
SELECT Compra.FechaEmision, 
       Compra.Proveedor, 
    Prov.Nombre, 
       CompraD.Articulo,
    ROUND(CompraD.CostoInv,4) AS CostoInventario 
 FROM Compra
JOIN CompraD ON Compra.ID = CompraD.ID
JOIN MovTipo  ON Compra.Mov = MovTipo.Mov AND MovTipo.Modulo = 'COMS' 
JOIN Prov    ON Compra.Proveedor = Prov.Proveedor 
JOIN Art     ON CompraD.Articulo = Art.Articulo 
WHERE 
    Compra.Empresa = @Empresa
AND MovTipo.Clave IN ('COMS.EI', 'COMS.EG', 'COMS.F') 
AND Art.Familia = @Familia 
AND dbo.fnFechaSinHOra(Compra.FechaEmision) BETWEEN @FechaD AND @FechaA
AND Compra.Estatus = 'CONCLUIDO'
GROUP BY Compra.FechaEmision,  
         Compra.Proveedor,
   Prov.Nombre, 
   CompraD.Articulo, 
   ROUND(CompraD.CostoInv,4)
ORDER BY Compra.FechaEmision DESC
RETURN 
END 
GO

/**************** ForcastSemanalCFNuk ****************/
if exists (select * from sysobjects where id = object_id('dbo.ForcastSemanalCFNuk') and type = 'P') DROP PROCEDURE dbo.ForcastSemanalCFNuk
GO
---exec ForcastSemanalCFNuk 'maserp',2024,8
CREATE PROCEDURE [dbo].[ForcastSemanalCFNuk]   
    @Usuario      varchar(10),   
    @Ejercicio    int,   
    @Periodo      int  
AS BEGIN    
 DECLARE     
 @Articulo  Varchar(25),    
 @Material  Varchar(25),    
 @CantidadV  float,    
 @Inventario  float,    
 @InventarioM float,    
 @DOH   float,    
 @Descripcion varchar(255),    
 @Total   float,    
 @TotalP   float,    
 @cubre   varchar(20),    
 @Req   float,    
 @Final   float,    
 @Producir  float,    
 @Bandera  int,    
 @PorAlcance  Float,    
 @AlcanceDias Float,    
 @Devolucion  Float    
  SELECT @Ejercicio = YEAR(GETDATE())    
  DELETE  ExplocionMatCF  WHERE Usuario = @Usuario   
  DECLARE cRforcastSemCFNuk1 CURSOR FOR    
 SELECT Articulo,Descripcion,  SUM(ISNULL(S1,0.00)  + ISNULL(S2,0.00)  + ISNULL(S3,0.00)  + ISNULL(S4,0.00)  + ISNULL(S5,0.00) +  
            ISNULL(S6,0.00)  + ISNULL(S7,0.00)  + ISNULL(S8,0.00)  + ISNULL(S9,0.00)  + ISNULL(S10,0.00) +  
            ISNULL(S11,0.00) + ISNULL(S12,0.00) + ISNULL(S13,0.00) + ISNULL(S14,0.00) + ISNULL(S15,0.00) +  
            ISNULL(S16,0.00) + ISNULL(S17,0.00) + ISNULL(S18,0.00) + ISNULL(S19,0.00) + ISNULL(S20,0.00) +  
            ISNULL(S21,0.00) + ISNULL(S22,0.00) + ISNULL(S23,0.00) + ISNULL(S24,0.00) + ISNULL(S25,0.00) +   
            ISNULL(S26,0.00) + ISNULL(S27,0.00) + ISNULL(S28,0.00) + ISNULL(S29,0.00) + ISNULL(S30,0.00) +   
            ISNULL(S31,0.00) + ISNULL(S32,0.00) + ISNULL(S33,0.00) + ISNULL(S34,0.00) + ISNULL(S35,0.00) +   
            ISNULL(S36,0.00) + ISNULL(S37,0.00) + ISNULL(S38,0.00) + ISNULL(S39,0.00) + ISNULL(S40,0.00) +   
            ISNULL(S41,0.00) + ISNULL(S42,0.00) + ISNULL(S43,0.00) + ISNULL(S44,0.00) + ISNULL(S45,0.00) +   
            ISNULL(S46,0.00) + ISNULL(S47,0.00) + ISNULL(S48,0.00) + ISNULL(S49,0.00) + ISNULL(S50,0.00) +   
            ISNULL(S51,0.00) + ISNULL(S52,0.00) + ISNULL(S53,0.00) + ISNULL(S54,0.00))   
 FROM ResumenPlaneacionCF     
 --WHERE Concepto = 'AUTOSERVICIO'   
 WHERE ResumenPlaneacionCF.Usuario = @Usuario  
  GROUP BY Articulo,Descripcion    
  --ORDER BY Articulo    
 OPEN cRforcastSemCFNuk1    
 FETCH NEXT FROM cRforcastSemCFNuk1 INTO @Articulo,@Descripcion,@Total    
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0     
   BEGIN    
  IF @@FETCH_STATUS <> -2     
    BEGIN    
      INSERT INTO ExplocionMatCF(Usuario, ArticuloPadre,DescripcionP,Total,Bandera, Articulo)    
   VALUES (@Usuario, @Articulo,@Descripcion,ROUND(ISNULL(@Total,0),0),1,@Articulo)    
    INSERT INTO ExplocionMatCF(ArticuloHijo, Usuario, DescripcionH, Rendimiento,ArticuloPadre,DescripcionP, Articulo)    
    SELECT DISTINCT(Material),@Usuario, ART.Descripcion1, Cantidad,@Articulo,ART.Descripcion1,Material FROM ArtMAterial     
    JOIN ART ON ART.Articulo = ArtMAterial.Material    
    WHERE ArtMAterial.Articulo = @Articulo    
    END    
    FETCH NEXT FROM cRforcastSemCFNuk1 INTO @Articulo,@Descripcion,@Total    
   END    
   CLOSE cRforcastSemCFNuk1    
   DEALLOCATE cRforcastSemCFNuk1    
   DECLARE cRforcastSemCFNuk CURSOR FOR    
   SELECT ArticuloPadre, ArticuloHijo, Total, Bandera  FROM ExplocionMatCF  WHERE Usuario = @Usuario   
 OPEN cRforcastSemCFNuk    
 FETCH NEXT FROM cRforcastSemCFNuk INTO @Articulo,@Material,@Total,@Bandera    
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0     
   BEGIN    
  IF @@FETCH_STATUS <> -2     
    BEGIN    
   IF @Total = 0 BEGIN SELECT @Total = 1 END     
   ---VENTAS    
   SELECT @CantidadV = 0    
   SELECT  @CantidadV = SUM(ISNULL(VentaD.Cantidad,0)) FROM Venta     
    JOIN VentaD ON Venta.id = VentaD.ID    
    WHERE Mov = 'Factura' AND Estatus = 'CONCLUIDO' AND Periodo = @Periodo     
    AND Ejercicio = @Ejercicio  AND VentaD.Articulo= @Articulo    
    GROUP BY VentaD.Articulo    
   --Devoluciones    
   SELECT @Devolucion = 0    
   SELECT  @Devolucion = SUM(ISNULL(VentaD.Cantidad,0)) FROM Venta     
    JOIN VentaD ON Venta.id = VentaD.ID    
    WHERE Mov = 'Devolucion Venta' AND Estatus = 'CONCLUIDO' AND Periodo = @Periodo     
    AND Ejercicio = @Ejercicio  AND VentaD.Articulo= @Articulo    
    GROUP BY VentaD.Articulo    
    SELECT @CantidadV = @CantidadV - @Devolucion    
   --inventarios    
   SELECT @Inventario = 0    
   SELECT @Inventario = SUM(Round(ArtDisponible.Disponible,0))--ArtDisponible.DispMenosApartado    
     FROM ArtDisponible    
   JOIN Alm ON ArtDisponible.Almacen=Alm.Almacen    
   JOIN Art ON ArtDisponible.Articulo=Art.Articulo    
   LEFT OUTER JOIN Prov ON Art.Proveedor=Prov.Proveedor    
   WHERE ArtDisponible.Empresa='INCF' AND ArtDisponible.Articulo = @Articulo    
   AND ArtDisponible.Almacen in ('40TENA CF','C. FRESCO','C. FRESCO1','C.FRESCO03','C.FRESCO04','PROCESADOS','REPROCESO') AND Art.Rama = 'EMPACADOS'    
   SELECT @InventarioM = 0    
   SELECT @InventarioM = SUM(round(ArtDisponible.Disponible,0))--ArtDisponible.DispMenosApartado    
     FROM ArtDisponible    
   JOIN Alm ON ArtDisponible.Almacen=Alm.Almacen    
   JOIN Art ON ArtDisponible.Articulo=Art.Articulo    
   LEFT OUTER JOIN Prov ON Art.Proveedor=Prov.Proveedor    
   WHERE ArtDisponible.Empresa='INCF' AND ArtDisponible.Articulo = @Material    
   AND ArtDisponible.Almacen Not in ('40TENA CF','C. FRESCO','C. FRESCO1','C.FRESCO03','C.FRESCO04','PROCESADOS','REPROCESO')     
   AND Art.Rama <> 'EMPACADOS'    
   --if @Articulo ='A4861' begin  select @CantidadV,@Total end    
   --UPDATE ExplocionMatCF SET Venta = ISNULL(@CantidadV,0) , PorVenta = (ISNULL(@CantidadV,0)/ISNULL(@Total,1)), InventarioP = ISNULL(@Inventario,0),     --DOH = (ISNULL(@Inventario,0)/(ISNULL(@Total,0)/26)), InvH = ISNULL(@InventarioM,0), InvRequerido=(
---ISNULL(Produciendo,0)*ISNULL(rendimiento,0)),    
   --InvFinal = ROUND((InvH -BobinaXConsumir),0), cubre = ISNULL(@cubre,'NO CUBRE'),Planear = (Total -ISNULL(@Inventario,0))    
   -- WHERE Articulo = @Articulo    
  /*********Produciendo*************/    
   SELECT @Producir = 0    
   SELECT @Producir = SUM(ISNULL(ProdD.Cantidad,0)) FROM Prod      
   JOIN ProdD ON Prod.ID = ProdD.ID    
   --WHERE Mov = 'Orden Produccion' AND  Estatus ='PENDIENTE' AND   Periodo = @Periodo     
   WHERE Mov = 'Entrada Produccion' AND  Estatus ='CONCLUIDO'  AND   Periodo = @Periodo     
    AND Ejercicio = @Ejercicio AND ProdD.Articulo = @Articulo    
    UPDATE ExplocionMatCF SET Produciendo = ISNULL(@Producir,0)   
   WHERE Articulo = @Articulo  AND  Usuario = @Usuario    
   IF ( @Req >= @Final)    
   BEGIN    
     SELECT @cubre = 'CUBRE'    
   END    
   ELSE    
   BEGIN    
    SELECT @cubre = 'NO CUBRE'    
   END    
   --SELECT @Articulo,Articulo,@CantidadV,@Total,ArticuloPadre,Bandera FROM ExplocionMatCF WHERE Articulo = @Articulo AND Bandera = 1 AND @Total<> 1    
   UPDATE ExplocionMatCF SET InvH = ISNULL(ROUND(@InventarioM,0),0)    
   WHERE ArticuloHijo = @Material  AND  Usuario = @Usuario     
   UPDATE ExplocionMatCF SET  
     Venta = ISNULL(@CantidadV,0) ,   
  PorVenta = (ROUND((ISNULL(@CantidadV,0)/ISNULL(NULLIF(@Total,0),1)),2)*100),   
  InventarioP = ISNULL(@Inventario,0),    
     DOH = (ISNULL(@Inventario,0)/NULLIF((ISNULL(@Total,0)/26),0)),   
  InvRequerido=(ISNULL(Produciendo,0)*ISNULL(rendimiento,0)),    
     InvFinal = ROUND((InvH -BobinaXConsumir),0),   
  cubre = ISNULL(@cubre,'NO CUBRE'),  
  Objetivo = 15    
    WHERE Articulo = @Articulo   
   AND @Bandera = 1  AND  Usuario = @Usuario    
    SELECT @Req = ROUND((ISNULL(Produciendo,0)*ISNULL(Rendimiento,0)),4) FROM ExplocionMatCF  WHERE ArticuloPadre = @Articulo   AND  Usuario = @Usuario    
    SELECT @Final = (InvH -BobinaXConsumir) FROM ExplocionMatCF  WHERE ArticuloPadre = @Articulo   AND  Usuario = @Usuario    
  /*Inventario componentes */    
   SELECT @TotalP =Total FROM ExplocionMatCF WHERE ArticuloPadre = @Articulo AND ArticuloHijo IS  NULL   AND  Usuario = @Usuario    
    UPDATE ExplocionMatCF SET InvRequerido = ROUND((@TotalP* rendimiento),0) WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo  AND  Usuario = @Usuario     
  /*Inventario componentes */    
     UPDATE ExplocionMatCF SET InvFinal = ROUND((InvH-InvRequerido),0) WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo   AND  Usuario = @Usuario     
   /*para los materiales  cubre o no */    
   IF (SELECT TOP 1 InvFinal FROM ExplocionMatCF WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo AND Total = 0 AND InvFinal IS NOT NULL AND  Usuario = @Usuario )<=0    
     BEGIN          
    UPDATE ExplocionMatCF SET Cubre = 'NO CUBRE' WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo AND Total = 0   AND  Usuario = @Usuario     
     END    
     ELSE    
     BEGIN    
    UPDATE ExplocionMatCF SET Cubre = 'CUBRE' WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo AND Total = 0   AND  Usuario = @Usuario     
     END    
   --/*  Porcenta en alcance de inventario*/    
    IF (SELECT TOP 1 InvRequerido FROM ExplocionMatCF WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo  AND  Usuario = @Usuario)= 0    
      BEGIN    
       UPDATE ExplocionMatCF SET PorAlcance =ROUND(((Invh/InvRequerido)),2)  WHERE  ArticuloHijo = @Material AND ArticuloPadre = @Articulo  AND  Usuario = @Usuario      
      END    
      ELSE    
      BEGIN    
      --IF (@Material = 'A5229' AND  @Articulo = 'A3213')BEGIN SELECT  ((Invh/InvRequerido)*100),* FROM  ExplocionMatCF WHERE ArticuloHijo = @Material AND ArticuloPadre = @Articulo END     
       UPDATE ExplocionMatCF SET PorAlcance =ROUND(((Invh/ NULLIF(InvRequerido,0))),2)  WHERE  ArticuloHijo = @Material AND ArticuloPadre = @Articulo  AND  Usuario = @Usuario       
      END    
   /* covertura entre 26 * LOS DIAS DEL PERIODO TRABAJADO */    
    UPDATE ExplocionMatCF SET AlcanceDias=(PorAlcance*26) WHERE  ArticuloHijo = @Material AND ArticuloPadre = @Articulo   AND  Usuario = @Usuario     
    END    
    FETCH NEXT FROM cRforcastSemCFNuk INTO @Articulo,@Material,@Total,@Bandera    
   END    
   CLOSE cRforcastSemCFNuk    
   DEALLOCATE cRforcastSemCFNuk    
   DECLARE cRforcastSemCFNuk2 CURSOR FOR    
  SELECT DISTINCT(ArticuloPadre) FROM ExplocionMatCF       
  WHERE Produciendo =0 AND Total <>0  AND Usuario = @Usuario    
 OPEN cRforcastSemCFNuk2    
 FETCH NEXT FROM cRforcastSemCFNuk2 INTO @Articulo    
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0     
   BEGIN    
  IF @@FETCH_STATUS <> -2     
    BEGIN    
    DELETE ExplocionMatCF WHERE ArticuloPadre = @Articulo AND Usuario = @Usuario     
    END    
    FETCH NEXT FROM cRforcastSemCFNuk2 INTO @Articulo    
   END    
   CLOSE cRforcastSemCFNuk2    
   DEALLOCATE cRforcastSemCFNuk2    
  DECLARE cRforcastSemCFNuk3 CURSOR FOR    
   SELECT DISTINCT(ArticuloPadre) FROM ExplocionMatCF    
  WHERE Produciendo =0 AND Total = 0 and ArticuloHijo is null  AND Usuario = @Usuario    
 OPEN cRforcastSemCFNuk3    
 FETCH NEXT FROM cRforcastSemCFNuk3 INTO @Articulo    
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0     
   BEGIN    
  IF @@FETCH_STATUS <> -2     
    BEGIN    
    --select @Articulo    
    DELETE ExplocionMatCF WHERE ArticuloPadre = @Articulo  AND Usuario = @Usuario    
    END    
    FETCH NEXT FROM cRforcastSemCFNuk3 INTO @Articulo    
   END    
   CLOSE cRforcastSemCFNuk3    
   DEALLOCATE cRforcastSemCFNuk3    
RETURN    
END  
GO

/**************** spForecastAyudaLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spForecastAyudaLista') and type = 'P') DROP PROCEDURE dbo.spForecastAyudaLista
GO
CREATE PROCEDURE [dbo].[spForecastAyudaLista] 
     @Usuario VARCHAR(10)
 ,@App VARCHAR(50)
 ,@Pregunta VARCHAR(100)
AS
    BEGIN
        --<MGOMEZ|2025.06.20|LOG USO / INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spForecastAyudaLista'
            ,'@Usuario: ' + ISNULL(@Usuario, 'NULL') + 
             ', @App:' + ISNULL(@App, 'NULL') + 
             ', @Pregunta:' +  ISNULL(@Pregunta, 'NULL'));
        --<MGOMEZ|2025.06.20|LOG USO / FIN>
     SELECT 
             ForecastAyuda.ID
      ,ForecastAyuda.Usuario
      ,Usuario.Nombre
      ,dbo.fnFechaSinHora(ForecastAyuda.Fecha) AS FechaEmision
      ,ForecastAyuda.Proceso
      ,ForecastAyuda.Pregunta
      ,ForecastAyuda.Respuesta
     FROM ForecastAyuda
     INNER JOIN Usuario
      ON ForecastAyuda.Usuario = Usuario.Usuario
     WHERE ForecastAyuda.Proceso = @App
      AND ForecastAyuda.Pregunta LIKE '%' + LTRIM(RTRIM(@Pregunta)) + '%'
     RETURN
    END
GO

/**************** spForecastAyudaGuardar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spForecastAyudaGuardar') and type = 'P') DROP PROCEDURE dbo.spForecastAyudaGuardar
GO
CREATE PROCEDURE spForecastAyudaGuardar 
           @Usuario    varchar(10),
     @ID         int = NULL, 
           @App        varchar(50),  
           @Pregunta   varchar(100),   
           @Respuesta  varchar(max), 
     @Eliminar   bit = NULL 
AS BEGIN 
DECLARE 
@Fecha   datetime = GETDATE(), 
@Ok       int,     
@OkRef    varchar(255)   
SELECT @ID = NULLIF(RTRIM(@ID), '')
BEGIN TRANSACTION  
  IF @ID IS NULL AND ISNULL(@Eliminar,0) = 0
  BEGIN 
    INSERT INTO ForecastAyuda (Usuario, Fecha, Proceso, Pregunta, Respuesta) VALUES 
            (@Usuario, @Fecha, @App,@Pregunta, @Respuesta)  
       IF @@ROWCOUNT = 0 SELECT @Ok = 10623, @OkRef = 'No Fue Posible Insertar la Ayuda'  
  END ELSE
  IF @ID IS NOT NULL AND ISNULL(@Eliminar,0) = 0
  BEGIN 
    UPDATE ForecastAyuda SET ForecastAyuda.Pregunta = @Pregunta, 
           ForecastAyuda.Respuesta =  @Respuesta 
           WHERE ForecastAyuda.ID = @ID
         IF @@ROWCOUNT = 0 SELECT @Ok = 10623, @OkRef = 'No Fue Posible Actualizar la Ayuda' 
  END ELSE 
  IF @ID IS NOT NULL AND ISNULL(@Eliminar,0) = 1
  BEGIN 
    DELETE ForecastAyuda WHERE ForecastAyuda.ID = @ID
    IF @@ROWCOUNT = 0 SELECT @Ok = 10623, @OkRef = 'No Fue Posible Eliminar la Ayuda' 
  END 
   IF @Ok IS NULL                                            
  BEGIN                                           
    COMMIT TRANSACTION                              
  END ELSE                                            
  BEGIN                                            
  ROLLBACK TRANSACTION                                            
  END                                            
  SELECT @Ok         AS Ok,                                           
         @OkRef      AS OkRef     
RETURN 
END 
GO

/**************** spFCForcastFiltro ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCForcastFiltro') and type = 'P') DROP PROCEDURE dbo.spFCForcastFiltro
GO
CREATE PROCEDURE spFCForcastFiltro 
                      @Usuario varchar(10), 
                      @Filtro  varchar(20)
AS BEGIN 
IF @Filtro = 'Concepto'  SELECT ResumenPlaneacionCF.Concepto   AS Filtro  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario GROUP BY ResumenPlaneacionCF.Concepto  ORDER BY ResumenPlaneacionCF.Concepto  ASC ELSE 
IF @Filtro = 'Cliente'   SELECT ResumenPlaneacionCF.NombreCte  AS Filtro  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario GROUP BY ResumenPlaneacionCF.NombreCte ORDER BY ResumenPlaneacionCF.NombreCte ASC ELSE 
IF @Filtro = 'Programa'  SELECT ResumenPlaneacionCF.Programa   AS Filtro  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario GROUP BY ResumenPlaneacionCF.Programa  ORDER BY ResumenPlaneacionCF.Programa  ASC ELSE 
IF @Filtro = 'Centro'    SELECT ResumenPlaneacionCF.CtTrabajo  AS Filtro  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario GROUP BY ResumenPlaneacionCF.CtTrabajo ORDER BY ResumenPlaneacionCF.CtTrabajo ASC ELSE 
IF @Filtro = 'Familia'   SELECT ResumenPlaneacionCF.Familia    AS Filtro  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario GROUP BY ResumenPlaneacionCF.Familia   ORDER BY ResumenPlaneacionCF.Familia   ASC 
RETURN 
END 
GO

/**************** spCFArticuloCumplimiento ****************/
if exists (select * from sysobjects where id = object_id('dbo.spCFArticuloCumplimiento') and type = 'P') DROP PROCEDURE dbo.spCFArticuloCumplimiento
GO
CREATE PROCEDURE spCFArticuloCumplimiento  
                     @Usuario     varchar(10),    
      @Ejercicio   int,   
      @Periodo     int,   
      @Centro      varchar(50) = NULL,   
      @Familia     varchar(50) = NULL   
AS BEGIN   
DECLARE   
@Empresa  char(5) = 'INCF',  
@FechaD  datetime,    
@FechaA  datetime   
IF UPPER(@Familia)  IN ('0', 'NULL', '(TODOS)','', '(ALL)', '') SELECT @Familia = NULL  
CREATE TABLE #Cumplimiento (      
        ID                        int    NOT NULL IDENTITY(1,1),      
        Centro                   varchar(10) COLLATE Database_Default NULL,     
        Articulo                 Varchar(20) COLLATE Database_Default NULL,   
        Familia                  varchar(50) COLLATE Database_Default NULL,       
        ProgramadoKg             float  NULL,      
        ProducidoKg              float  NULL,    
        ProgramadoPzas           float  NULL,      
        ProducidoPzas            float  NULL,   
        Gramaje                  float  NULL)   
CREATE TABLE #CumplimientoTotal (      
        ID                        int    NOT NULL IDENTITY(1,1),      
        Centro                   varchar(10) COLLATE Database_Default NULL,     
        Articulo                 Varchar(20) COLLATE Database_Default NULL,   
  Descripcion              varchar(100) COLLATE Database_Default NULL,   
        Familia                  varchar(50) COLLATE Database_Default NULL,       
        ProgramadoKg             float  NULL,      
        ProducidoKg              float  NULL,    
        ProgramadoPzas           float  NULL,      
        ProducidoPzas            float  NULL,   
        Cumplimiento             float  NULL)   
DELETE #CumplimientoTotal
DELETE #Cumplimiento
 SELECT @FechaD = MIN(FECHAINICIO),   
        @FechaA = MAX(FECHAFIN)  
   FROM DIM_TIEMPO_SEMANA   
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio    
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo  
INSERT  INTO #Cumplimiento (Centro, Articulo, Familia, ProgramadoKg, ProgramadoPzas, ProducidoPzas, Gramaje)  
 SELECT ResumenPlaneacionCF.CtTrabajo,  
        ResumenPlaneacionCF.Articulo,   
        ResumenPlaneacionCF.FamiliaCF,   
     ResumenPlaneacionCF.Kg,   
     ResumenPlaneacionCF.Producir,   
     dbo.fnWebProducidoFechasAcumArticulo(@Empresa, ResumenPlaneacionCF.CtTrabajo, ResumenPlaneacionCF.Articulo, @FechaD, @FechaA),   
     ResumenPlaneacionCF.Gramaje  
  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario  
  AND ISNULL(ResumenPlaneacionCF.FamiliaCF, '') = ISNULL(ISNULL(@Familia,  ResumenPlaneacionCF.FamiliaCF), '')  
  AND ISNULL(ResumenPlaneacionCF.CtTrabajo, '') = ISNULL(ISNULL(@Centro,  ResumenPlaneacionCF.CtTrabajo), '')   
  UPDATE #Cumplimiento SET ProducidoKg = ISNULL(ProducidoPzas,0.0) * ISNULL(Gramaje,0)  
 INSERT INTO #CumplimientoTotal (Centro, Familia, Articulo, Descripcion, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas, Cumplimiento)  
  SELECT #Cumplimiento.Centro,   
         #Cumplimiento.Familia,    
         #Cumplimiento.Articulo,   
   Art.Descripcion1 AS Descripcion,   
         SUM(ISNULL(#Cumplimiento.ProgramadoKg,0.00)),      
         SUM(ISNULL(#Cumplimiento.ProducidoKg ,0.00)),      
         SUM(ISNULL(#Cumplimiento.ProgramadoPzas ,0.00)),    
            SUM(ISNULL(#Cumplimiento.ProducidoPzas  ,0.00)),   
            ROUND(dbo.fnPorcentajeImporte(SUM(ISNULL(#Cumplimiento.ProgramadoPzas  ,0.00)), SUM(ISNULL(#Cumplimiento.ProducidoPzas ,0.00))),2)
   FROM #Cumplimiento  
   JOIN Art ON #Cumplimiento.Articulo = Art.Articulo   
   GROUP BY #Cumplimiento.Centro,   
         #Cumplimiento.Familia,    
         #Cumplimiento.Articulo,   
   Art.Descripcion1  
INSERT INTO #CumplimientoTotal (Centro, Familia, Descripcion, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas)
   SELECT 
          '', '', 
     'TOTAL', SUM(ISNULL(#CumplimientoTotal.ProgramadoKg,0.00)),  
                  SUM(ISNULL(#CumplimientoTotal.ProducidoKg,0.00)),  
      SUM(ISNULL(#CumplimientoTotal.ProgramadoPzas,0.00)),  
      SUM(ISNULL(#CumplimientoTotal.ProducidoPzas,0.00))
    FROM #CumplimientoTotal
SELECT #CumplimientoTotal.Centro, 
       #CumplimientoTotal.Familia, 
    #CumplimientoTotal.Articulo, 
    #CumplimientoTotal.Descripcion, 
    #CumplimientoTotal.ProgramadoKg, 
    #CumplimientoTotal.ProducidoKg, 
    #CumplimientoTotal.ProgramadoPzas, 
    #CumplimientoTotal.ProducidoPzas, 
    #CumplimientoTotal.Cumplimiento
FROM #CumplimientoTotal ORDER BY ID ASC 
RETURN   
END  
GO

/**************** spCFCentraTrabajoCumplimiento ****************/
if exists (select * from sysobjects where id = object_id('dbo.spCFCentraTrabajoCumplimiento') and type = 'P') DROP PROCEDURE dbo.spCFCentraTrabajoCumplimiento
GO
CREATE PROCEDURE spCFCentraTrabajoCumplimiento  
                     @Usuario     varchar(10),    
                     @Ejercicio   int,   
                     @Periodo     int  
AS BEGIN   
DECLARE   
@Empresa  char(5) = 'INCF',  
@FechaD  datetime,    
@FechaA  datetime   
CREATE TABLE #Cumplimiento (      
        ID                        int    NOT NULL IDENTITY(1,1),      
        Centro                   varchar(10) COLLATE Database_Default NULL,         
        ProgramadoKg             float  NULL,      
        ProducidoKg              float  NULL,    
        ProgramadoPzas           float  NULL,      
        ProducidoPzas            float  NULL,   
        Gramaje                  float  NULL)     
CREATE TABLE #CumplimientoTotal (      
        ID                        int    NOT NULL IDENTITY(1,1),      
        Centro                   varchar(10) COLLATE Database_Default NULL,         
        ProgramadoKg             float  NULL,      
        ProducidoKg              float  NULL,    
        ProgramadoPzas           float  NULL,      
        ProducidoPzas            float  NULL,   
        Cumplimiento             float  NULL)  
  
DELETE #Cumplimiento
DELETE #CumplimientoTotal
 SELECT @FechaD = MIN(FECHAINICIO),   
        @FechaA = MAX(FECHAFIN)  
   FROM DIM_TIEMPO_SEMANA   
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio    
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo  
INSERT  INTO #Cumplimiento (Centro, ProgramadoKg, ProgramadoPzas, ProducidoPzas, Gramaje)  
 SELECT ResumenPlaneacionCF.CtTrabajo,   
     ResumenPlaneacionCF.Kg,   
     ResumenPlaneacionCF.Producir,   
     dbo.fnWebProducidoFechasAcumArticulo(@Empresa, ResumenPlaneacionCF.CtTrabajo, ResumenPlaneacionCF.Articulo, @FechaD, @FechaA),   
     ResumenPlaneacionCF.Gramaje  
  FROM ResumenPlaneacionCF WHERE Usuario = @Usuario  
  UPDATE #Cumplimiento SET ProducidoKg = ISNULL(ProducidoPzas,0.0) * ISNULL(Gramaje,0)  
INSERT INTO #CumplimientoTotal(Centro, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas, Cumplimiento)   
  SELECT #Cumplimiento.Centro,    
         SUM(ISNULL(#Cumplimiento.ProgramadoKg,0.00)),      
            SUM(ISNULL(#Cumplimiento.ProducidoKg ,0.00)),      
      SUM(ISNULL(#Cumplimiento.ProgramadoPzas ,0.00)),    
            SUM(ISNULL(#Cumplimiento.ProducidoPzas  ,0.00)),   
            ROUND(dbo.fnPorcentajeImporte(SUM(ISNULL(#Cumplimiento.ProgramadoPzas  ,0.00)), SUM(ISNULL(#Cumplimiento.ProducidoPzas ,0.00))),2)  
   FROM #Cumplimiento  
   GROUP BY #Cumplimiento.Centro  
   INSERT INTO #CumplimientoTotal(Centro, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas)   
   SELECT 
     'TOTAL', SUM(ISNULL(#CumplimientoTotal.ProgramadoKg,0.00)),  
                  SUM(ISNULL(#CumplimientoTotal.ProducidoKg,0.00)),  
      SUM(ISNULL(#CumplimientoTotal.ProgramadoPzas,0.00)),  
      SUM(ISNULL(#CumplimientoTotal.ProducidoPzas,0.00))
    FROM #CumplimientoTotal
 SELECT #CumplimientoTotal.Centro, 
        #CumplimientoTotal.ProgramadoKg, 
     #CumplimientoTotal.ProducidoKg, 
     #CumplimientoTotal.ProgramadoPzas, 
     #CumplimientoTotal.ProducidoPzas, 
     #CumplimientoTotal.Cumplimiento
    FROM #CumplimientoTotal ORDER BY ID ASC 
RETURN   
END 
GO

/**************** spWebForecastHistLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastHistLista') and type = 'P') DROP PROCEDURE dbo.spWebForecastHistLista
GO
CREATE PROCEDURE spWebForecastHistLista  
                       @Usuario    varchar(10), 
        @Ejercicio  int,  
        @Periodo    int
AS BEGIN 
SELECT  
  ForecastHist.ID, 
  ForecastHist.FechaEmision, 
  ForecastHist.Ejercicio AS Ejercicio, 
  ForecastHist.Periodo   AS Mes, 
  ForecastHist.Usuario, 
  Usuario.Nombre, 
  ForecastHist.MovID AS Version 
  FROM ForecastHist
  JOIN Usuario ON ForecastHist.Usuario = Usuario.Usuario
  WHERE 
   ForecastHist.Ejercicio = @Ejercicio
  AND  ForecastHist.Periodo  = @Periodo
RETURN 
END 
GO

/**************** spForecastLog ****************/
if exists (select * from sysobjects where id = object_id('dbo.spForecastLog') and type = 'P') DROP PROCEDURE dbo.spForecastLog
GO
CREATE PROCEDURE spForecastLog 
           @Usuario    varchar(10),
           @App        varchar(50),  
           @Actividad  varchar(100),   
           @Log        varchar(max) 
AS BEGIN 
DECLARE 
@Fecha   datetime = GETDATE(), 
@Ok       int,     
@OkRef    varchar(255)   
BEGIN TRANSACTION  
    INSERT INTO PortalForecastLog (Usuario, Fecha, Proceso, Actividad, Historial) VALUES 
            (@Usuario, @Fecha, @App, @Actividad, @Log)  
       IF @@ROWCOUNT = 0 SELECT @Ok = 10623, @OkRef = 'No Fue Posible Insertar el Log'  
   IF @Ok IS NULL                                            
  BEGIN                                           
    COMMIT TRANSACTION                              
  END ELSE                                            
  BEGIN                                            
  ROLLBACK TRANSACTION                                            
  END                                            
  SELECT @Ok         AS Ok,                                           
         @OkRef      AS OkRef     
RETURN 
END 
GO

/**************** spFCForcastCFAgrupar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCForcastCFAgrupar') and type = 'P') DROP PROCEDURE dbo.spFCForcastCFAgrupar
GO
CREATE PROCEDURE spFCForcastCFAgrupar 
            @Usuario   varchar(10)
AS BEGIN 
DECLARE 
 @Articulo varchar(20), 
 @ID       int, 
 @S1   float,  @S2   float,  @S3   float,  @S4   float,  @S5   float,  @S6   float,  @S7   float,  @S8   float,  @S9   float,  @S10  float,
 @S11  float,  @S12  float,  @S13  float,  @S14  float,  @S15  float,  @S16  float,  @S17  float,  @S18  float,  @S19  float,  @S20  float,
 @S21  float,  @S22  float,  @S23  float,  @S24  float,  @S25  float,  @S26  float,  @S27  float,  @S28  float,  @S29  float,  @S30  float,
 @S31  float,  @S32  float,  @S33  float,  @S34  float,  @S35  float,  @S36  float,  @S37  float,  @S38  float,  @S39  float,  @S40  float,
 @S41  float,  @S42  float,  @S43  float,  @S44  float,  @S45  float,  @S46  float,  @S47  float,  @S48  float,  @S49  float,  @S50  float, 
 @S51  float,  @S52  float,  @S53  float,  @S54  float
    DECLARE crArticulo CURSOR FOR     
    SELECT ResumenPlaneacionCF.Articulo, MIN(ResumenPlaneacionCF.ID)  
   FROM ResumenPlaneacionCF 
  WHERE ResumenPlaneacionCF.Usuario = @Usuario
 GROUP BY ResumenPlaneacionCF.Articulo
 HAVING COUNT(*) > 1  
    OPEN crArticulo    
    FETCH NEXT FROM crArticulo INTO @Articulo, @ID 
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN 
SELECT   @S1 =  NULL,  @S2 =  NULL,  @S3 =  NULL,  @S4 =  NULL,  @S5 =  NULL,  @S6 =  NULL,  @S7 =  NULL,  @S8 =  NULL,  @S9 =  NULL,  @S10 =  NULL, 
   @S11 =  NULL, @S12 =  NULL, @S13 =  NULL, @S14 =  NULL, @S15 =  NULL, @S16 =  NULL, @S17 =  NULL, @S18 =  NULL, @S19 =  NULL, @S20 =  NULL, 
   @S21 =  NULL, @S22 =  NULL, @S23 =  NULL, @S24 =  NULL, @S25 =  NULL, @S26 =  NULL, @S27 =  NULL, @S28 =  NULL, @S29 =  NULL, @S30 =  NULL, 
   @S31 =  NULL, @S32 =  NULL, @S33 =  NULL, @S34 =  NULL, @S35 =  NULL, @S36 =  NULL, @S37 =  NULL, @S38 =  NULL, @S39 =  NULL, @S40 =  NULL, 
    @S41 =  NULL, @S42 =  NULL, @S43 =  NULL, @S44 =  NULL, @S45 =  NULL, @S46 =  NULL, @S47 =  NULL, @S48 =  NULL, @S49 =  NULL, @S50 =  NULL, 
      @S51 =  NULL, @S52 =  NULL, @S53 =  NULL, @S54 =  NULL
   SELECT 
    @S1 = SUM(ISNULL(S1,0.00)),   @S2 = SUM(ISNULL(S2,0.00)),   @S3 = SUM(ISNULL(S3,0.00)),   @S4 = SUM(ISNULL(S4,0.00)),   @S5 = SUM(ISNULL(S5,0.00)), 
    @S6 = SUM(ISNULL(S6,0.00)),   @S7 = SUM(ISNULL(S7,0.00)),   @S8 = SUM(ISNULL(S8,0.00)),   @S9 = SUM(ISNULL(S9,0.00)),   @S10 = SUM(ISNULL(S10,0.00)), 
    @S11 = SUM(ISNULL(S11,0.00)), @S12 = SUM(ISNULL(S12,0.00)), @S13 = SUM(ISNULL(S13,0.00)), @S14 = SUM(ISNULL(S14,0.00)), @S15 = SUM(ISNULL(S15,0.00)), 
    @S16 = SUM(ISNULL(S16,0.00)), @S17 = SUM(ISNULL(S17,0.00)), @S18 = SUM(ISNULL(S18,0.00)), @S19 = SUM(ISNULL(S19,0.00)), @S20 = SUM(ISNULL(S20,0.00)), 
    @S21 = SUM(ISNULL(S21,0.00)), @S22 = SUM(ISNULL(S22,0.00)), @S23 = SUM(ISNULL(S23,0.00)), @S24 = SUM(ISNULL(S24,0.00)), @S25 = SUM(ISNULL(S25,0.00)), 
    @S26 = SUM(ISNULL(S26,0.00)), @S27 = SUM(ISNULL(S27,0.00)), @S28 = SUM(ISNULL(S28,0.00)), @S29 = SUM(ISNULL(S29,0.00)), @S30 = SUM(ISNULL(S30,0.00)), 
    @S31 = SUM(ISNULL(S31,0.00)), @S32 = SUM(ISNULL(S32,0.00)), @S33 = SUM(ISNULL(S33,0.00)), @S34 = SUM(ISNULL(S34,0.00)), @S35 = SUM(ISNULL(S35,0.00)), 
    @S36 = SUM(ISNULL(S36,0.00)), @S37 = SUM(ISNULL(S37,0.00)), @S38 = SUM(ISNULL(S38,0.00)), @S39 = SUM(ISNULL(S39,0.00)), @S40 = SUM(ISNULL(S40,0.00)), 
    @S41 = SUM(ISNULL(S41,0.00)), @S42 = SUM(ISNULL(S42,0.00)), @S43 = SUM(ISNULL(S43,0.00)), @S44 = SUM(ISNULL(S44,0.00)), @S45 = SUM(ISNULL(S45,0.00)), 
    @S46 = SUM(ISNULL(S46,0.00)), @S47 = SUM(ISNULL(S47,0.00)), @S48 = SUM(ISNULL(S48,0.00)), @S49 = SUM(ISNULL(S49,0.00)), @S50 = SUM(ISNULL(S50,0.00)), 
    @S51 = SUM(ISNULL(S51,0.00)), @S52 = SUM(ISNULL(S52,0.00)), @S53 = SUM(ISNULL(S53,0.00)), @S54 = SUM(ISNULL(S54,0.00))
   FROM 
   ResumenPlaneacionCF
   WHERE 
    ResumenPlaneacionCF.Usuario = @Usuario
   AND ResumenPlaneacionCF.Articulo = @Articulo
   UPDATE ResumenPlaneacionCF SET 
     S1 =  @S1,  S2 =  @S2,  S3 =  @S3,  S4 =  @S4,  S5 =  @S5,  S6 =  @S6,  S7 =  @S7,  S8 =  @S8,  S9 =  @S9, S10 = @S10, 
    S11 = @S11, S12 = @S12, S13 = @S13, S14 = @S14, S15 = @S15, S16 = @S16, S17 = @S17, S18 = @S18, S19 = @S19, S20 = @S20, 
    S21 = @S21, S22 = @S22, S23 = @S23, S24 = @S24, S25 = @S25, S26 = @S26, S27 = @S27, S28 = @S28, S29 = @S29, S30 = @S30, 
    S31 = @S31, S32 = @S32, S33 = @S33, S34 = @S34, S35 = @S35, S36 = @S36, S37 = @S37, S38 = @S38, S39 = @S39, S40 = @S40, 
    S41 = @S41, S42 = @S42, S43 = @S43, S44 = @S44, S45 = @S45, S46 = @S46, S47 = @S47, S48 = @S48, S49 = @S49, S50 = @S50, 
    S51 = @S51, S52 = @S52, S53 = @S53, S54 = @S54
   WHERE 
     ResumenPlaneacionCF.ID = @ID
   DELETE ResumenPlaneacionCF 
    WHERE ResumenPlaneacionCF.Articulo = @Articulo 
   AND ResumenPlaneacionCF.ID <> @ID 
   AND ResumenPlaneacionCF.Usuario = @Usuario
      END    
      FETCH NEXT FROM crArticulo INTO @Articulo, @ID    
    END    
    CLOSE crArticulo    
    DEALLOCATE crArticulo
 
RETURN 
END 
GO

/**************** spArtDisponibleForecast ****************/
if exists (select * from sysobjects where id = object_id('dbo.spArtDisponibleForecast') and type = 'P') DROP PROCEDURE dbo.spArtDisponibleForecast
GO
CREATE PROCEDURE spArtDisponibleForecast 
                         @Empresa      char(5), 
       @Articulo     varchar(20), 
       @Disponible   float OUTPUT 
AS BEGIN  
  SELECT @Disponible = SUM(ISNULL(ArtDisponible.Disponible,0.00))  
    FROM ArtDisponibleVaca ArtDisponible  
  JOIN Alm ON ArtDisponible.Almacen=Alm.Almacen  
   WHERE ArtDisponible.Empresa = @Empresa  
   AND ArtDisponible.Articulo = @Articulo  
   AND Alm.EmpacadoCF = 1 
RETURN 
END
GO

/**************** spFCBasesjson ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCBasesjson') and type = 'P') DROP PROCEDURE dbo.spFCBasesjson
GO
CREATE PROCEDURE [dbo].[spFCBasesjson]  
  @Usuario  varchar(10), 
  @Centro  varchar(10)  
  AS BEGIN   
DECLARE   
  @CentroDescripcion varchar(100),   
  @DiasHabilies      float,   
  @DiasTiempoExtra   float,   
  @HorasDia          float,   
  @Eficiencia        float,   
  @MinutosHora       float = 60,   
  @JsonData NVARCHAR(MAX) = '[',   
    @Estatus                   varchar(15),   
    @CapacidadtnHora           float,   
    @CambioMallas              float,   
    @Turnos                    float,   
    @HorasTurnos               float,   
    @CambiosBolsaPresentacion  float,   
    @CambiosVariedad           float,   
    @CapDiaCr                  float,  
 @EficienciaPrograma        float ,   
 @EficienciaProgramaAcum    float = 0,   
 @CapacidadReal             int,   
 @Tipo                      varchar(30),   
 @Estacion         varchar(10),           
 @Descripcion      varchar(100),              
 @BolsasxMinutos   float,   
 @BolsasxHora      float,   
 @BolsasxDia       float,   
 @TiempoLimpieza            float,   
 @TiempoComida              float ,   
 @TiempoCambiosBobina       float,   
 @TiempoCambioEnfardadora   float,  
 @TiemponocontablesMin      float,   
 @CapacidadRealPiezas       float,   
 @CapMes                    float,   
 @EstacionJson NVARCHAR(MAX) = '',   
 @Capacidadtnturno          float,   
 @CapacidadRealtnTurno      float,   
 @CapacidadRealtnDia        float,   
 @CapacidadRealtnMes        float, 
 @CapacidadHras             float
SELECT @Tipo = CentroFCTemp.Tipo    
  FROM CentroFCTemp  
 WHERE CentroFCTemp.Centro = @Centro  
     AND CentroFCTemp.Usuario = @Usuario 
IF @Tipo IN ('Envasado', 'Cribado')  
BEGIN   
    DECLARE crCentroFC CURSOR FOR       
   SELECT  
      CentroFCTemp.Descripcion,  
   CentroFCTemp.DiasHabilies,   
   CentroFCTemp.DiasTiempoExtra,   
   CentroFCTemp.HorasDia,   
   CentroFCTemp.Eficiencia,   
   CentroFCTemp.Tipo  
  FROM CentroFCTemp 
   WHERE Centro = @Centro  
     AND CentroFCTemp.Usuario = @Usuario 
    OPEN crCentroFC      
    FETCH NEXT FROM crCentroFC INTO @CentroDescripcion, @DiasHabilies,  @DiasTiempoExtra, @HorasDia, @Eficiencia, @Tipo  
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN     
   EXEC spFCCentroCapacidadReal  @Usuario,@Centro, @CapacidadHras OUTPUT,  @CapacidadReal OUTPUT  
                       SET @JsonData +=  '{"Centro":"'               + CAST(@Centro AS NVARCHAR(10))   
                         + '","Tipo":"'              + CONVERT(varchar,ISNULL(@Tipo, ''))  
                                           + '","Descripcion":"'              + CONVERT(varchar,ISNULL(@CentroDescripcion, ''))  
                         + '","DiasHabiles":'             + ISNULL(CONVERT(varchar, @DiasHabilies),'0')           
                                           + ',"DiasTiempoExtra":' + CONVERT(varchar,ISNULL(@DiasTiempoExtra,0))      
             + ',"HorasDia":'        + CONVERT(varchar,ISNULL(@HorasDia,0))      
             + ',"Eficiencia":'      + CONVERT(varchar,ISNULL(@Eficiencia,0))   
    + ',"CapacidadHras":'      + CONVERT(varchar,ISNULL(@CapacidadHras,0))   
             + ',"TotalCapacidadRealmes":'      + CONVERT(varchar,ISNULL(@CapacidadReal,0))  
                                           + ',"Estaciones":['    
 DECLARE crEstacion CURSOR FOR       
      SELECT 
  EstacionTFCTemp.Estacion,  
  EstacionTFCTemp.Descripcion,  
  ISNULL(EstacionTFCTemp.BolsasxMinutos,0),     
  ISNULL(EstacionTFCTemp.BolsasxMinutos  * @MinutosHora,0.00),   
  ISNULL((EstacionTFCTemp.BolsasxMinutos * @MinutosHora) * @HorasDia,0.00),   
  ISNULL(EstacionTFCTemp.TiempoLimpieza,0.00),    
  ISNULL(EstacionTFCTemp.TiempoComida,0.00),   
  ISNULL(EstacionTFCTemp.TiempoCambiosBobina,0.00),   
  ISNULL(EstacionTFCTemp.TiempoCambioEnfardadora, 0.00),  
  ISNULL(EstacionTFCTemp.TiempoLimpieza,0.00) +   
  ISNULL(EstacionTFCTemp.TiempoComida,0.00) +   
  ISNULL(EstacionTFCTemp.TiempoCambiosBobina,0.00) +   
  ISNULL(EstacionTFCTemp.TiempoCambioEnfardadora, 0.00)  
     FROM EstacionTFCTemp   
       WHERE EstacionTFCTemp.Centro = @Centro  
      AND EstacionTFCTemp.Usuario = @Usuario 
     ORDER BY dbo.fnRellenarCerosIZquierda(EstacionTFCTemp.Estacion, 10)  ASC    
    OPEN crEstacion      
    FETCH NEXT FROM crEstacion INTO @Estacion, @Descripcion, @BolsasxMinutos, @BolsasxHora, @BolsasxDia, @TiempoLimpieza, @TiempoComida, @TiempoCambiosBobina,   
                                 @TiempoCambioEnfardadora, @TiemponocontablesMin  
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN    
             SELECT @CapacidadRealPiezas = (ISNULL(@HorasDia,0.00) - (ISNULL(@TiemponocontablesMin,0.00) / @MinutosHora)) * @BolsasxHora,   
           @EficienciaPrograma   = dbo.fnPorcentaje(@CapacidadRealPiezas, @Eficiencia)  
              SET @EstacionJson   += '{"Estacion":"'               + CAST(@Estacion AS NVARCHAR(10))           
                                   + '","Descripcion":"'              + CONVERT(varchar,ISNULL(@Descripcion, ''))          
                    + '","BolsasxMinutos":'                           + ISNULL(CONVERT(varchar, @BolsasxMinutos),'0')      
     + ',"BolsasxHora":'                             + ISNULL(CONVERT(varchar, @BolsasxHora ),'0')    
     + ',"TiempoLimpieza":'                          + ISNULL(CONVERT(varchar, @TiempoLimpieza ),'0')    
     + ',"TiempoComida":'                              + ISNULL(CONVERT(varchar, @TiempoComida ),'0')   
     + ',"TiempoCambiosBobina":'                       + ISNULL(CONVERT(varchar, @TiempoCambiosBobina ),'0')   
     + ',"TiempoCambiosEnfardadora":'                  + ISNULL(CONVERT(varchar, @TiempoCambioEnfardadora ),'0')   
     + ',"Tiemponocontables":'                         + ISNULL(CONVERT(varchar, @TiemponocontablesMin ),'0')   
     + ',"CapacidadRealPiezas":'                     + ISNULL(CONVERT(varchar, @CapacidadRealPiezas ),'0')  
     + ',"EficienciaPrograma":'                     + ISNULL(CONVERT(varchar, dbo.fnPorcentaje(@CapacidadRealPiezas, @Eficiencia) ),'0')  
                    +'},'     
      END      
      FETCH NEXT FROM crEstacion INTO  @Estacion, @Descripcion, @BolsasxMinutos, @BolsasxHora, @BolsasxDia, @TiempoLimpieza, @TiempoComida, @TiempoCambiosBobina,   
                                    @TiempoCambioEnfardadora, @TiemponocontablesMin     
    END      
    CLOSE crEstacion      
    DEALLOCATE crEstacion   
        SET @EstacionJson = LEFT(@EstacionJson, LEN(@EstacionJson) - 1)          
                                         SET @JsonData += @EstacionJson + ']},'    
      END      
      FETCH NEXT FROM crCentroFC INTO @CentroDescripcion, @DiasHabilies,  @DiasTiempoExtra, @HorasDia, @Eficiencia, @Tipo    
    END      
    CLOSE crCentroFC      
    DEALLOCATE crCentroFC   
END ELSE   
IF @Tipo IN ('Maquila')  
BEGIN
   DECLARE crCentroFC CURSOR FOR       
   SELECT  
 CentroFCTemp.Descripcion,  
 CentroFCTemp.DiasHabilies,   
    CentroFCTemp.Tipo 
  FROM CentroFCTemp 
  WHERE Centro = @Centro  
   AND CentroFCTemp.Usuario = @Usuario 
    OPEN crCentroFC      
    FETCH NEXT FROM crCentroFC INTO @CentroDescripcion, @DiasHabilies, @Tipo 
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN    
   
     EXEC spFCCentroCapacidadReal  @Usuario,@Centro, @CapacidadHras OUTPUT,  @CapacidadReal OUTPUT  
                       SET @JsonData +=  '{"Centro":"'               + CAST(@Centro AS NVARCHAR(10))   
                          + '","Tipo":"'              + CONVERT(varchar,ISNULL(@Tipo, ''))  
                                           + '","Descripcion":"'              + CONVERT(varchar,ISNULL(@CentroDescripcion, ''))  
                         + '","DiasHabiles":'             + ISNULL(CONVERT(varchar, @DiasHabilies),'0')  
       + ',"CapacidadHras":'      + CONVERT(varchar,ISNULL(@CapacidadHras,0))  
             + ',"TotalCapacidadRealmes":'      + CONVERT(varchar,ISNULL(@CapacidadReal,0))  
                                           + ',"Estaciones":['    
 DECLARE crEstacion CURSOR FOR       
      SELECT EstacionTFCTemp.Estacion,  
             EstacionTFCTemp.Descripcion,  
             ISNULL(EstacionTFCTemp.CapDiaCr,0),   
             ISNULL(EstacionTFCTemp.CapDiaCr,0) * ISNULL(@DiasHabilies,0.00)  
     FROM EstacionTFCTemp   
    WHERE EstacionTFCTemp.Centro = @Centro   
  AND EstacionTFCTemp.Usuario = @Usuario 
    ORDER BY dbo.fnRellenarCerosIzquierda(EstacionTFCTemp.Estacion, 10)  ASC  
    OPEN crEstacion      
    FETCH NEXT FROM crEstacion INTO @Estacion, @Descripcion, @CapDiaCr, @CapMes  
    WHILE @@FETCH_STATUS <> -1      
    BEGIN            IF @@FETCH_STATUS <> -2       
      BEGIN    
                SET @EstacionJson  += '{"Estacion":"'           + CAST(@Estacion AS NVARCHAR(10))           
                                   + '","Descripcion":"'        + CONVERT(varchar,ISNULL(@Descripcion, ''))          
                                   + '","CapDiaCrKg":'          + ISNULL(CONVERT(varchar, @CapDiaCr),'0')      
                    + ',"TotalCapacidadRealmes":'+ ISNULL(CONVERT(varchar, @CapMes ),'0')    
                                   +'},'     
      END      
      FETCH NEXT FROM crEstacion INTO  @Estacion, @Descripcion, @CapDiaCr, @CapMes  
    END      
    CLOSE crEstacion      
    DEALLOCATE crEstacion   
        SET @EstacionJson = LEFT(@EstacionJson, LEN(@EstacionJson) - 1)          
                                         SET @JsonData += @EstacionJson + ']},'    
      END      
      FETCH NEXT FROM crCentroFC INTO  @CentroDescripcion, @DiasHabilies, @Tipo  
    END      
    CLOSE crCentroFC      
    DEALLOCATE crCentroFC   
END ELSE  
IF @Tipo IN ('Cribado Mitades')  
BEGIN   
    DECLARE crCentroFC CURSOR FOR       
   SELECT  
      CentroFCTemp.Descripcion,  
   CentroFCTemp.DiasHabilies,   
   CentroFCTemp.DiasTiempoExtra,   
   CentroFCTemp.Tipo 
  FROM CentroFCTemp   
  WHERE CentroFCTemp.Centro = @Centro  
   AND CentroFCTemp.Usuario = @Usuario 
    OPEN crCentroFC      
    FETCH NEXT FROM crCentroFC INTO @CentroDescripcion, @DiasHabilies, @DiasTiempoExtra, @Tipo 
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN    
       EXEC spFCCentroCapacidadReal  @Usuario,@Centro, @CapacidadHras OUTPUT,  @CapacidadReal OUTPUT  
                       SET @JsonData +=  '{"Centro":"'            + CAST(@Centro AS NVARCHAR(10))   
                          + '","Tipo":"'              + CONVERT(varchar,ISNULL(@Tipo, ''))  
                                           + '","Descripcion":"'     + CONVERT(varchar,ISNULL(@CentroDescripcion, ''))  
                                           + '","DiasHabiles":'    + ISNULL(CONVERT(varchar, @DiasHabilies),'0')           
                                           + ',"DiasTiempoExtra":' + CONVERT(varchar,ISNULL(@DiasTiempoExtra,0))    
                + ',"CapacidadHras":'      + CONVERT(varchar,ISNULL(@CapacidadHras,0))  
                                           + ',"TotalCapacidadRealmes":' + CONVERT(varchar,ISNULL(@CapacidadReal,0))  
                                           + ',"Estaciones":['    
 DECLARE crEstacion CURSOR FOR       
      SELECT EstacionTFCTemp.Estacion,  
             EstacionTFCTemp.Descripcion,  
             ISNULL(EstacionTFCTemp.CapacidadtnHora,0),     
    ISNULL(EstacionTFCTemp.HorasTurnos,0),  
    ISNULL(EstacionTFCTemp.CapacidadtnHora,0.00)  * ISNULL(EstacionTFCTemp.HorasTurnos,0.00),   
     ISNULL(EstacionTFCTemp.CambioMallas,0.00),    
     ISNULL(EstacionTFCTemp.TiempoComida,0.00),  
     ISNULL(EstacionTFCTemp.CambioMallas,0.00) +   
     ISNULL(EstacionTFCTemp.TiempoComida,0.00),   
     ISNULL(NULLIF(RTRIM(EstacionTFCTemp.Turnos), ''),1)  
       FROM EstacionTFCTemp   
       WHERE EstacionTFCTemp.Centro = @Centro  
      AND EstacionTFCTemp.Usuario = @Usuario 
     ORDER BY dbo.fnRellenarCerosIZquierda(EstacionTFCTemp.Estacion, 10)  ASC    
    OPEN crEstacion      
    FETCH NEXT FROM crEstacion INTO @Estacion, @Descripcion, @CapacidadtnHora, @HorasTurnos, @Capacidadtnturno, @CambioMallas, @TiempoComida, @TiemponocontablesMin, @Turnos  
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN    
             SELECT @CapacidadRealtnTurno = (ISNULL(@HorasTurnos,0.00) - (ISNULL(@TiemponocontablesMin,0.00) / @MinutosHora)) * ISNULL(@CapacidadtnHora, 0.00),   
           @CapacidadRealtnDia   = ISNULL(@Turnos,0.00) * ISNULL(@CapacidadRealtnTurno,0.00),   
           @CapacidadRealtnMes   = (ISNULL(@DiasHabilies,0.00) +  ISNULL(@DiasTiempoExtra,0.00)) * ISNULL(@CapacidadRealtnDia,0.00)  
              SET @EstacionJson   += '{"Estacion":"'               + CAST(@Estacion AS NVARCHAR(10))           
                                   + '","Descripcion":"'              + CONVERT(varchar,ISNULL(@Descripcion, ''))          
                    + '","CapacidadtnHora":'                         + ISNULL(CONVERT(varchar, @CapacidadtnHora),'0')    
  + ',"Turnos":'                             + ISNULL(CONVERT(varchar, @Turnos ),'0')   
     + ',"HorasTurnos":'                             + ISNULL(CONVERT(varchar, @HorasTurnos ),'0')    
     + ',"Capacidadtnturno":'                        + ISNULL(CONVERT(varchar, @Capacidadtnturno ),'0')   
     + ',"CambioMallas":'                         + ISNULL(CONVERT(varchar, @CambioMallas ),'0')   
     + ',"TiempoComida":'                         + ISNULL(CONVERT(varchar, @TiempoComida ),'0')   
     + ',"Tiemponocontables":'                    + ISNULL(CONVERT(varchar, @TiemponocontablesMin ),'0')   
        + ',"CapacidadRealtnTurno":'                 + ISNULL(CONVERT(varchar, @CapacidadRealtnTurno ),'0')   
     + ',"CapacidadRealtnDia":'                   + ISNULL(CONVERT(varchar, @CapacidadRealtnDia ),'0')   
     + ',"CapacidadRealtnMes":'                   + ISNULL(CONVERT(varchar, @CapacidadRealtnMes ),'0')   
                    +'},'     
      END      
      FETCH NEXT FROM crEstacion INTO  @Estacion, @Descripcion, @CapacidadtnHora, @HorasTurnos, @Capacidadtnturno, @CambioMallas, @TiempoComida, @TiemponocontablesMin, @Turnos  
    END      
    CLOSE crEstacion      
    DEALLOCATE crEstacion   
        SET @EstacionJson = LEFT(@EstacionJson, LEN(@EstacionJson) - 1)          
                                         SET @JsonData += @EstacionJson + ']},'    
      END      
      FETCH NEXT FROM crCentroFC INTO @CentroDescripcion, @DiasHabilies, @DiasTiempoExtra, @Tipo   
    END      
    CLOSE crCentroFC      
    DEALLOCATE crCentroFC   
END   
 SET @JsonData = LEFT(@JsonData, LEN(@JsonData) - 1)           
    IF NULLIF(RTRIM(@JsonData), '') IS NOT NULL SET @JsonData += ']'   
    SELECT NULLIF(RTRIM(@JsonData), '') AS json     
RETURN   
END  
GO

/**************** spFCProducirAsignar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCProducirAsignar') and type = 'P') DROP PROCEDURE dbo.spFCProducirAsignar
GO
CREATE PROCEDURE spFCProducirAsignar     
    @Usuario        varchar(10),     
    @Ejercicio      int,     
    @Periodo        int    
AS BEGIN     
DECLARE     
 @Articulo       varchar(20),    
 @Disponible     float,     
 @DisponiblAcum  float,     
 @ID             int,     
 @S1             char(5),     
 @S2             char(5),     
 @S3             char(5),      
 @S4             char(5),      
 @S5             char(5),      
 @P1             char(5),     
 @P2             char(5),     
 @P3             char(5),      
 @P4             char(5),      
 @P5             char(5),    
 @Importe1       float,     
 @Importe2       float,     
 @Importe3       float,     
 @Importe4       float,     
 @Importe5       float,     
 @PI1            float,     
 @PI2            float,     
 @PI3            float,      
 @PI4            float,      
 @PI5            float,     
 @Semana         int,     
 @Contador       int,     
 @SQL            nvarchar(max),      
 @Parametros     nvarchar(max)     
   DECLARE crSemana CURSOR FOR     
 SELECT DIM_TIEMPO_SEMANA.SEMANA,  ROW_NUMBER() OVER (ORDER BY DIM_TIEMPO_SEMANA.SEMANA)    
   FROM DIM_TIEMPO_SEMANA     
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio      
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo    
     ORDER BY DIM_TIEMPO_SEMANA.SEMANA ASC    
    OPEN crSemana        
    FETCH NEXT FROM crSemana INTO @Semana, @Contador     
    WHILE @@FETCH_STATUS <> -1        
    BEGIN        
      IF @@FETCH_STATUS <> -2         
      BEGIN     
    IF @Contador = 1 SELECT @S1='S'+CONVERT(varchar, @Semana), @P1='P'+CONVERT(varchar, @Semana) ELSE     
    IF @Contador = 2 SELECT @S2='S'+CONVERT(varchar, @Semana), @P2='P'+CONVERT(varchar, @Semana) ELSE     
    IF @Contador = 3 SELECT @S3='S'+CONVERT(varchar, @Semana), @P3='P'+CONVERT(varchar, @Semana) ELSE     
    IF @Contador = 4 SELECT @S4='S'+CONVERT(varchar, @Semana), @P4='P'+CONVERT(varchar, @Semana) ELSE     
    IF @Contador = 5 SELECT @S5='S'+CONVERT(varchar, @Semana), @P5='P'+CONVERT(varchar, @Semana)     
      END        
      FETCH NEXT FROM crSemana INTO @Semana, @Contador       
    END        
    CLOSE crSemana        
    DEALLOCATE crSemana     
 IF @S5 IS NULL SELECT @S5 = 'Venta'    
     DECLARE crArt CURSOR FOR         
      SELECT ResumenPlaneacionCF.Articulo,     
          ISNULL(ResumenPlaneacionCF.InvGra,0.00) + ISNULL(ResumenPlaneacionCF.InvEmp,0.00)     
  FROM ResumenPlaneacionCF    
   WHERE ResumenPlaneacionCF.Usuario = @Usuario    
      GROUP  BY ResumenPlaneacionCF.Articulo,     
             ResumenPlaneacionCF.InvGra,     
    ResumenPlaneacionCF.InvEmp      
    OPEN crArt        
    FETCH NEXT FROM crArt INTO @Articulo,  @Disponible    
    WHILE @@FETCH_STATUS <> -1        
    BEGIN        
      IF @@FETCH_STATUS <> -2         
      BEGIN      
      SELECT @DisponiblAcum = @Disponible    
  SET @SQL = 'DECLARE crID CURSOR FOR         
    SELECT ResumenPlaneacionCF.ID,     
     ['+@S1+'],       
        ['+@S2+'],       
        ['+@S3+'],       
        ['+@S4+'],     
     ['+@S5+']    
      FROM ResumenPlaneacionCF    
         WHERE     
             ResumenPlaneacionCF.Usuario = @Usuario    
         AND ResumenPlaneacionCF.Articulo = @Articulo'     
           SET @Parametros = '@Usuario varchar(10), @Articulo varchar(20)'      
             EXEC sp_executesql @SQL, @Parametros, @Usuario = @Usuario, @Articulo = @Articulo      
   OPEN crID        
   FETCH NEXT FROM crID INTO @ID, @Importe1, @Importe2,@Importe3, @Importe4, @Importe5     
   WHILE @@FETCH_STATUS <> -1        
   BEGIN        
     IF @@FETCH_STATUS <> -2         
     BEGIN       
     SELECT @PI1 = NULL, @PI2 = NULL, @PI3 = NULL, @PI4 = NULL, @PI5 = NULL      
     IF ISNULL(@DisponiblAcum,0.00) > ISNULL(@Importe1,0.00) SELECT @PI1 = 0.00 ELSE SELECT @PI1 = CASE WHEN ISNULL(@DisponiblAcum,0.00) > 0.00 THEN ISNULL(@Importe1,0.00) - ISNULL(@DisponiblAcum,0.00) ELSE ISNULL(@Importe1,0.00) END     
      SELECT @DisponiblAcum = ISNULL(@DisponiblAcum,0.00) - ISNULL(@Importe1,0.00)    
      IF ISNULL(@DisponiblAcum,0.00) > ISNULL(@Importe2,0.00) SELECT @PI2 = 0.00 ELSE SELECT @PI2 = CASE WHEN ISNULL(@DisponiblAcum,0.00) > 0.00 THEN ISNULL(@Importe2,0.00) - ISNULL(@DisponiblAcum,0.00) ELSE ISNULL(@Importe2,0.00) END     
      SELECT @DisponiblAcum = ISNULL(@DisponiblAcum,0.00) - ISNULL(@Importe2,0.00)    
      IF ISNULL(@DisponiblAcum,0.00) > ISNULL(@Importe3,0.00) SELECT @PI3 = 0.00 ELSE SELECT @PI3 = CASE WHEN ISNULL(@DisponiblAcum,0.00) > 0.00 THEN ISNULL(@Importe3,0.00) - ISNULL(@DisponiblAcum,0.00) ELSE ISNULL(@Importe3,0.00) END     
      SELECT @DisponiblAcum = ISNULL(@DisponiblAcum,0.00) - ISNULL(@Importe3,0.00)    
      IF ISNULL(@DisponiblAcum,0.00) > ISNULL(@Importe4,0.00) SELECT @PI4 = 0.00 ELSE SELECT @PI4 = CASE WHEN ISNULL(@DisponiblAcum,0.00) > 0.00 THEN ISNULL(@Importe4,0.00) - ISNULL(@DisponiblAcum,0.00) ELSE ISNULL(@Importe4,0.00) END     
      SELECT @DisponiblAcum = ISNULL(@DisponiblAcum,0.00) - ISNULL(@Importe4,0.00)    
      IF @S5 NOT IN ('Venta')     
      BEGIN     
      IF ISNULL(@DisponiblAcum,0.00) > ISNULL(@Importe5,0.00) SELECT @PI5 = 0.00 ELSE SELECT @PI5 = CASE WHEN ISNULL(@DisponiblAcum,0.00) > 0.00 THEN ISNULL(@Importe5,0.00) - ISNULL(@DisponiblAcum,0.00) ELSE ISNULL(@Importe5,0.00) END     
      SELECT @DisponiblAcum = ISNULL(@DisponiblAcum,0.00) - ISNULL(@Importe5,0.00)    
      SET @SQL = 'UPDATE ResumenPlaneacionCF SET '+@P5+' = '+CONVERT(varchar,ROUND(@PI5,0))     
               +' WHERE ResumenPlaneacionCF.ID = '+ CONVERT(varchar, @ID)              
               EXEC (@SQL)     
      END     
      SET @SQL = 'UPDATE ResumenPlaneacionCF SET '+@P1+' = '+CONVERT(varchar,ROUND(@PI1,0))+','+                 
                                                            @P2+' = '+CONVERT(varchar,ROUND(@PI2,0))+','+     
               @P3+' = '+CONVERT(varchar,ROUND(@PI3,0))+','+    
               @P4+' = '+CONVERT(varchar,ROUND(@PI4,0))    
               +' WHERE ResumenPlaneacionCF.ID = '+ CONVERT(varchar, @ID)              
               EXEC (@SQL)       
     END        
     FETCH NEXT FROM crID INTO  @ID, @Importe1, @Importe2,@Importe3, @Importe4, @Importe5     
   END        
   CLOSE crID        
   DEALLOCATE crID     
      END        
      FETCH NEXT FROM crArt INTO  @Articulo,  @Disponible       
    END        
    CLOSE crArt        
    DEALLOCATE crArt     
RETURN     
END     
GO

/**************** spFCCentroCapacidadReal ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCCentroCapacidadReal') and type = 'P') DROP PROCEDURE dbo.spFCCentroCapacidadReal
GO
CREATE PROCEDURE spFCCentroCapacidadReal  
           @Usuario       varchar(10),
     @Centro        varchar(10), 
     @CapacidadHras float   OUTPUT,    
           @CapacidadPzas float   OUTPUT 
AS BEGIN 
DECLARE 
@Tipo          varchar(20), 
@MinutosXHora  float = 60,   
@Resultado     float 
SELECT @Tipo = CentroFC.Tipo 
 FROM CentroFC 
WHERE CentroFC.Centro = @Centro
IF @Tipo IN ('Envasado', 'Cribado')  
BEGIN 
 SELECT     
     @CapacidadHras = SUM(((ISNULL(HorasDia,0.00) - 
       ((ISNULL(EstacionTFCTemp.TiempoLimpieza,0.00) +   
         ISNULL(EstacionTFCTemp.TiempoComida,0.00) +   
            ISNULL(EstacionTFCTemp.TiempoCambiosBobina,0.00) +   
         ISNULL(EstacionTFCTemp.TiempoCambioEnfardadora, 0.00)) / @MinutosXHora))) * 
        (ISNULL(CentroFCTemp.DiasHabilies,0.00) + ISNULL(CentroFCTemp.DiasTiempoExtra,0.00))),
   @CapacidadPzas = SUM(ISNULL(dbo.fnPorcentaje(ISNULL(EstacionTFCTemp.BolsasxMinutos,0.00) * ISNULL(@MinutosXHora,0.00) *   
                          (ISNULL(CentroFCTemp.HorasDia,0.00) - (  
                          (ISNULL(EstacionTFCTemp.TiempoLimpieza,0.00) +   
                           ISNULL(EstacionTFCTemp.TiempoComida,0.00) +   
                           ISNULL(EstacionTFCTemp.TiempoCambiosBobina,0.00) +   
                          ISNULL(EstacionTFCTemp.TiempoCambioEnfardadora, 0.00)) / ISNULL(@MinutosXHora,0.00))), CentroFCTemp.Eficiencia),0.00)  * (ISNULL(CentroFCTemp.DiasHabilies, 0.00) + ISNULL(CentroFCTemp.DiasTiempoExtra,0.00))) 
  FROM EstacionTFCTemp  
  JOIN CentroFCTemp ON EstacionTFCTemp.Centro = CentroFCTemp.Centro  AND EstacionTFCTemp.Usuario = CentroFCTemp.Usuario   
  WHERE EstacionTFCTemp.Centro  = @Centro
    AND CentroFCTemp.Usuario = @Usuario 
END ELSE 
IF @Tipo IN ('Maquila')  
BEGIN 
 SELECT @CapacidadPzas = SUM(ISNULL(ISNULL(EstacionTFCTemp.CapDiaCr,0.00) * ISNULL(CentroFCTemp.DiasHabilies,0.00),0.00)), 
        @CapacidadHras = 0.01
  FROM EstacionTFCTemp  
  JOIN CentroFCTemp ON EstacionTFCTemp.Centro = CentroFCTemp.Centro AND EstacionTFCTemp.Usuario = CentroFCTemp.Usuario  
  WHERE EstacionTFCTemp.Centro  = @Centro   
   AND EstacionTFCTemp.Usuario = @Usuario
END 
RETURN 
END 
GO

/**************** spWebInicioConcentrado ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebInicioConcentrado') and type = 'P') DROP PROCEDURE dbo.spWebInicioConcentrado
GO
CREATE PROCEDURE spWebInicioConcentrado
                        @Usuario     varchar(10), 
      @Ejercicio   int,  
      @Periodo     int
AS BEGIN
CREATE TABLE #InicioConcentado (    
        ID                         int    NOT NULL IDENTITY(1,1),    
        Familia                    varchar(50) COLLATE Database_Default NULL,    
        PzaProducirse              float  NULL,       
        KilogramosdeUso            float  NULL)  
DELETE #InicioConcentado
INSERT INTO #InicioConcentado (Familia, PzaProducirse, KilogramosdeUso)   SELECT 
        ResumenPlaneacionCF.FamiliaCF AS Familia, 
        SUM(ISNULL(ResumenPlaneacionCF.Producir,0.00)), 
        SUM(ISNULL(ResumenPlaneacionCF.Kg,0.00))
 FROM 
       ResumenPlaneacionCF 
 WHERE ResumenPlaneacionCF.Usuario  = @Usuario
 GROUP BY ResumenPlaneacionCF.FamiliaCF
 HAVING SUM(ISNULL(Producir,0.00)) > 0.00
 ORDER BY ResumenPlaneacionCF.FamiliaCF ASC
INSERT INTO #InicioConcentado (Familia, PzaProducirse, KilogramosdeUso)  
  SELECT 'Total',  
         ROUND(SUM(ISNULL(#InicioConcentado.PzaProducirse, 0.00)), 0), 
   ROUND(SUM(ISNULL(#InicioConcentado.KilogramosdeUso,0.00)),0)
  FROM #InicioConcentado
  SELECT #InicioConcentado.Familia, 
         #InicioConcentado.PzaProducirse, 
   #InicioConcentado.KilogramosdeUso
    FROM  #InicioConcentado 
    ORDER BY #InicioConcentado.ID ASC
RETURN 
END 
GO

/**************** spWebPortalProdArticulo ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebPortalProdArticulo') and type = 'P') DROP PROCEDURE dbo.spWebPortalProdArticulo
GO
CREATE PROCEDURE spWebPortalProdArticulo
       @Empresa      char(5), 
       @Usuario      varchar(10),   
       @FechaD       datetime,   
       @FechaA       datetime, 
    @Articulo     varchar(20), 
    @Cantidad     float OUTPUT 
AS BEGIN 
   SELECT @Cantidad = SUM(ISNULL(ProdD.Cantidad,0)) 
    FROM Prod        
    JOIN ProdD ON Prod.ID = ProdD.ID          
   WHERE 
         Prod.Empresa = @Empresa
    AND  Prod.Mov = 'Entrada Produccion' 
    AND  Prod.Estatus ='CONCLUIDO'     
    AND  Prod.FechaEmision BETWEEN @FechaD AND @FechaA
 AND  ProdD.Articulo = @Articulo 
RETURN 
END 
GO

/**************** spWebPortalVentaArticulo ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebPortalVentaArticulo') and type = 'P') DROP PROCEDURE dbo.spWebPortalVentaArticulo
GO
CREATE PROCEDURE spWebPortalVentaArticulo
       @Empresa      char(5), 
       @Usuario      varchar(10),   
       @FechaD       datetime,   
       @FechaA       datetime, 
    @Articulo     varchar(20), 
    @Importe      float OUTPUT 
AS BEGIN 
  SELECT @Importe =   ROUND(SUM(CASE WHEN MovTipo.Clave = 'VTAS.F' THEN  ISNULL(VentaTCalc.CantidadNeta,0.00) 
                                                                   ELSE -ISNULL(VentaTCalc.CantidadNeta,0.00) END),0)  
   FROM VentaTCalc     
   JOIN MovTipo ON VentaTCalc.Mov = MovTipo.Mov     
   WHERE VentaTCalc.Empresa = @Empresa    
    AND VentaTCalc.FechaEmision BETWEEN @FechaD AND @FechaA    
  AND MovTipo.Clave IN ('VTAS.F', 'VTAS.D')     
  AND VentaTCalc.Estatus = 'CONCLUIDO'    
  AND VentaTCalc.Articulo = @Articulo    
  AND MovTipo.Modulo = 'VTAS'  
RETURN 
END 
GO

/**************** spWebArtMaterialReqProrrateo ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArtMaterialReqProrrateo') and type = 'P') DROP PROCEDURE dbo.spWebArtMaterialReqProrrateo
GO
CREATE PROCEDURE spWebArtMaterialReqProrrateo          
       @Empresa      char(5),           
       @Usuario      varchar(10),             
       @Ejercicio    int,             
       @Periodo      int            
AS BEGIN           
DECLARE           
@CentroTrabajo  varchar(10),           
@Articulo     varchar(20),          
@ArticuloHijo varchar(20),       
@Descripcion  varchar(100),           
@Disponible   float,           
@ID           int,           
@Material     varchar(20),           
@InvRequerido float,           
@InvFinal     float,           
@Faltante     float,           
@FechaD       datetime,           
@FechaA       datetime,           
@Produciendo  float,           
@Venta        float,           
@PorAlcance   float,           
@AlcanceDias  float,           
@Total        float,         
@InventarioP  float      
SELECT @FechaD = MIN(FechaD) ,           
    @FechaA = MAX(FechaA)           
FROM dbo.fnDim_Tiempo_Semana(@Ejercicio, @Periodo)            
 DELETE  ExplocionMatCF  WHERE Usuario = @Usuario              
  EXEC spWebArtExplosionMaterial @Usuario, @Ejercicio,  @Periodo     
   EXEC spWebArtExplosionMatFaltante @Empresa, @Usuario, 2      
     DECLARE crExplocion  CURSOR FOR           
     SELECT ExplocionMatCF.ArticuloPadre,       
            ExplocionMatCF.ArticuloHijo,       
            ExplocionMatCF.Faltante       
   FROM ExplocionMatCF      
   WHERE ExplocionMatCF.Nivel  = 2          
     AND ExplocionMatCF.SeProduce = 1       
     AND ExplocionMatCF.Usuario = @Usuario       
    OPEN crExplocion          
    FETCH NEXT FROM crExplocion INTO @Articulo,  @ArticuloHijo,  @Faltante        
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN        
    UPDATE ExplocionMatCF       
       SET ExplocionMatCF.InvRequerido = CONVERT(float, Rendimiento) * CONVERT(float, @Faltante)    
     WHERE ExplocionMatCF.ArticuloPadre = @Articulo      
       AND ExplocionMatCF.SubArticulo  = @ArticuloHijo      
    AND ExplocionMatCF.Nivel         = 3      
    AND ExplocionMatCF.Usuario = @Usuario       
      END          
      FETCH NEXT FROM crExplocion INTO @Articulo,  @ArticuloHijo,  @Faltante       
    END          
    CLOSE crExplocion          
    DEALLOCATE crExplocion      
   EXEC spWebArtExplosionMatFaltante @Empresa, @Usuario, 3      
 DECLARE crArticulo CURSOR FOR               
    SELECT ExplocionMatCF.ArticuloPadre          
      FROM ExplocionMatCF           
     WHERE ExplocionMatCF.Usuario = @Usuario           
     GROUP BY ExplocionMatCF.ArticuloPadre          
    OPEN crArticulo              
    FETCH NEXT FROM crArticulo INTO @Articulo           
    WHILE @@FETCH_STATUS <> -1              
    BEGIN              
      IF @@FETCH_STATUS <> -2               
      BEGIN           
   SELECT @Produciendo  = NULL           
      /*    
    EXEC spWebPortalProdArticulo @Empresa, @Usuario, @FechaD, @FechaA, @Articulo, @Produciendo OUTPUT           
    UPDATE ExplocionMatCF SET ExplocionMatCF.Produciendo = @Produciendo       
                        WHERE ExplocionMatCF.Usuario = @Usuario       
           AND ExplocionMatCF.ArticuloPadre = @Articulo       
        AND ExplocionMatCF.Bandera = 1  */        
    ---EXEC spWebPortalVentaArticulo  @Empresa, @Usuario, @FechaD, @FechaA, @Articulo, @Venta OUTPUT        
       UPDATE ExplocionMatCF           
          SET ---ExplocionMatCF.Venta = @Venta,            
              ExplocionMatCF.PorVenta = (ROUND((ISNULL(Venta,0)/ISNULL(NULLIF(Total,0),1)),2)*100)          
        WHERE ExplocionMatCF.Usuario = @Usuario           
          AND ExplocionMatCF.ArticuloPadre = @Articulo           
          AND ExplocionMatCF.Bandera       = 1           
      END              
      FETCH NEXT FROM crArticulo INTO @Articulo              
    END              
    CLOSE crArticulo              
    DEALLOCATE crArticulo           
   RETURN           
   END 
GO

/**************** spWebFCFaltanteInsumos ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebFCFaltanteInsumos') and type = 'P') DROP PROCEDURE dbo.spWebFCFaltanteInsumos
GO
 CREATE PROCEDURE spWebFCFaltanteInsumos      
                     @Usuario      varchar(10),       
            @Ejercicio    int,       
                     @Periodo      int       
AS BEGIN         
  CREATE TABLE #Existencia (            
  Articulo                     varchar(20)  COLLATE Database_Default NULL,         
  DisponibilidadICF            float NULL,   
  InvRequerido                 float NULL,   
  Faltante                     float NULL,   
  InvMin                       float NULL,   
  InvMax                       float NULL,   
  INVENTARIOALMACENADOAVC      float NULL,        
  INVENTARIOALMACENADOPBC      float NULL,         
  EXISTENCIASAVC               float NULL,         
  ARRIBOSAVC                   float NULL,         
  EXISTENCIASPBC               float NULL)        
  INSERT INTO #Existencia(Articulo, InvRequerido,  InvMin, InvMax)       
   SELECT ExplocionMatCF.ArticuloHijo, SUM(ISNULL(InvRequerido,0.00)) , ROUND(UT_MAX_MIN_COMPRA.InvMinimoKg,0), ROUND(UT_MAX_MIN_COMPRA.InvMaximoKg,0)      
    FROM          
    ExplocionMatCF     
  LEFT OUTER JOIN  UT_MAX_MIN_COMPRA ON ExplocionMatCF.ArticuloHijo = UT_MAX_MIN_COMPRA.Articulo  AND UT_MAX_MIN_COMPRA.Empresa = 'INCF'    
   WHERE  ExplocionMatCF.ArticuloHijo IS NOT NULL     
   AND ExplocionMatCF.Usuario = @Usuario    
   GROUP BY ExplocionMatCF.ArticuloHijo,   
            UT_MAX_MIN_COMPRA.InvMinimoKg,     
            UT_MAX_MIN_COMPRA.InvMaximoKg     
    UPDATE #Existencia SET #Existencia.DisponibilidadICF = dbo.fnWebArtMaterialDisponible ('INCF', Articulo)     
   UPDATE #Existencia SET Faltante =   - (ISNULL(DISPONIBILIDADICF,0.00) - ISNULL(InvRequerido,0.00))  
   SELECT        
    #Existencia.Articulo                                                              AS Articulo,         
    Descripcion1                                                                      AS Descripcion,          
    CONVERT(decimal(18,0),ISNULL(InvRequerido,0.00))                                  AS InventarioRequerido,        
    CONVERT(decimal(18,0),ISNULL(CONVERT(float,DISPONIBILIDADICF),0.00))              AS DisponibilidadICF,         
    CONVERT(decimal(18,0),dbo.fnMayor(ISNULL(Faltante,0.00),0))                       AS Faltante,        
                ''                                                                    AS RequisicionEnviadaAlERP,     
    ROUND(#Existencia.InvMin,0)                                                       AS InvMin,     
    ROUND(#Existencia.InvMax,0)                                                       AS InvMax    
    FROM #Existencia            
     LEFT OUTER JOIN  Art         ON #Existencia.Articulo = Art.Articulo      
    WHERE  Art.Grupo IN     ('INSUMOS DE PRODUCCION')  
    AND Art.Grupo NOT IN ('SIN CLASIFICAR')  
    AND ISNULL(Faltante,0.00) > 0.00    
  RETURN         
  END  
GO

/**************** spSituacionPermiteAvanzarFC ****************/
if exists (select * from sysobjects where id = object_id('dbo.spSituacionPermiteAvanzarFC') and type = 'P') DROP PROCEDURE dbo.spSituacionPermiteAvanzarFC
GO
CREATE PROCEDURE spSituacionPermiteAvanzarFC 
    @Modulo     varchar(5), 
 @Mov     varchar(20),
 @Situacion    varchar(50),
 @Usuario    varchar(10), 
 @PermiteAvanzar         bit  OUTPUT 
AS BEGIN 
DECLARE 
 @SiguienteSituacion varchar(50) 
    SELECT @SiguienteSituacion = dbo.fnSituacionSiguienteFC(@Modulo, @Mov, @Situacion) 
    SELECT @PermiteAvanzar = dbo.fnSituacionPermiteAvanzarFC(@Modulo, @Mov, @SiguienteSituacion, @Usuario) 
RETURN 
END 
GO

/**************** spWebSituacionInicialFC ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebSituacionInicialFC') and type = 'P') DROP PROCEDURE dbo.spWebSituacionInicialFC
GO
CREATE PROCEDURE spWebSituacionInicialFC
               @Modulo   varchar(5), 
               @Mov    varchar(20),
      @Situacion   varchar(50) OUTPUT
AS BEGIN
  SELECT @Situacion      = NULL
  DECLARE crSituacion CURSOR
      FOR SELECT RTRIM(LTRIM(MovSituacionFC.Situacion))
           FROM MovSituacionFC
          WHERE MovSituacionFC.Modulo = @Modulo
      AND MovSituacionFC.Mov = @Mov
          ORDER BY MovSituacionFC.Orden ASC
  OPEN crSituacion
  FETCH NEXT FROM crSituacion INTO @Situacion
  CLOSE crSituacion
  DEALLOCATE crSituacion
  RETURN
END
GO

/**************** spFC_PP_PlanSemanaGuardar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFC_PP_PlanSemanaGuardar') and type = 'P') DROP PROCEDURE dbo.spFC_PP_PlanSemanaGuardar
GO
CREATE PROCEDURE spFC_PP_PlanSemanaGuardar      
                      @Usuario        varchar(10),       
                      @Ejercicio      int,       
                      @Periodo        int,       
                      @ID             int,       
                      @Semana         int,       
                      @CentroTrabajo  varchar(20),       
                      @json    varchar(max)      
AS BEGIN       
DECLARE       
@Modulo           char(5) = 'FC' ,       
@Mov              varchar(20) = 'Plan Semanal',       
@Situacion        varchar(50),         
@FechaTrabajo     datetime = GETDATE(),        
@FechaEmision     datetime,       
@Empresa          char(5) = 'INCF',       
@PPSID            int,       
@Estacion         varchar(255),      
@Articulo         varchar(20),       
@Renglon          int,       
@Lun              float,      
@Mar              float,      
@Mie              float,      
@Jue              float,      
@Vie              float,      
@Sab              float,      
@Dom              float,      
@Total            float,       
@Ok               int,       
@OkRef            varchar(255)      
SELECT @FechaEmision = dbo.fnfechaSinHora(@FechaTrabajo)      
SELECT @PPSID = ForecastPlanSemanal.ID       
  FROM ForecastPlanSemanal       
 WHERE ForecastPlanSemanal.Empresa       = @Empresa       
   AND ForecastPlanSemanal.Ejercicio     = @Ejercicio       
   AND ForecastPlanSemanal.Periodo       = @Periodo       
   AND ForecastPlanSemanal.Semana        = @Semana      
   AND ForecastPlanSemanal.CentroTrabajo = @CentroTrabajo      
   --AND ForecastPlanSemanal.FCID    =  @ID    
 BEGIN TRANSACTION      
IF @PPSID IS NULL       
BEGIN       
EXEC spWebSituacionInicialFC @Modulo, @Mov, @Situacion OUTPUT      
INSERT INTO ForecastPlanSemanal (Empresa, FechaEmision, UltimoCambio, Ejercicio, Periodo, Semana, Usuario, Situacion, SituacionUsuario, CentroTrabajo, FCID) VALUES       
                                (@Empresa, @FechaEmision, @FechaTrabajo, @Ejercicio, @Periodo, @Semana, @Usuario, @Situacion, @Usuario, @CentroTrabajo, @ID)       
              SELECT @PPSID = SCOPE_IDENTITY()       
              IF @@ROWCOUNT = 0 SELECT @Ok = 30110    
    DECLARE crForecastPlan CURSOR FOR           
      SELECT      
        ROW_NUMBER() OVER (ORDER BY j.Articulo) * 2048,       
  j.EstacionTrabajo,       
  j.Articulo,      
  j.Lun,      
  j.Mar,      
  j.Mie,      
  j.Jue,      
  j.Vie,      
  j.Sab,      
  j.Dom,      
  j.Total               
 FROM OPENJSON ( @json )                                            
  WITH (EstacionTrabajo       varchar(255),       
        Articulo       varchar(10),       
  Lun            float,       
  Mar            float,       
  Mie            float,       
  Jue            float,       
  Vie            float,       
  Sab            float,       
  Dom            float,       
  Total          float) As j         
  WHERE NULLIF(RTRIM(j.Articulo), '') IS NOT NULL       
    OPEN crForecastPlan          
    FETCH NEXT FROM crForecastPlan INTO @Renglon,@Estacion,@Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total       
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN          
   INSERT INTO ForecastPlanSemanalD (ID,  Estacion, Renglon, Articulo, Lun, Mar, Mie, Jue, Vie, Sab, Dom, Total)       
                               VALUES  (@PPSID, @Estacion, @Renglon,@Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total)      
             IF @@ROWCOUNT = 0 SELECT @Ok = 30110         
      END          
      FETCH NEXT FROM crForecastPlan INTO @Renglon,@Estacion,@Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total          
    END          
    CLOSE crForecastPlan          
    DEALLOCATE crForecastPlan       
END ELSE       
IF @PPSID IS NOT NULL       
BEGIN       
DELETE ForecastPlanSemanalD WHERE ID =  @PPSID      
    DECLARE crForecastPlan CURSOR FOR           
      SELECT      
        ROW_NUMBER() OVER (ORDER BY j.Articulo) * 2048,       
  j.EstacionTrabajo,      
  j.Articulo,      
  j.Lun,      
  j.Mar,      
  j.Mie,      
  j.Jue,      
  j.Vie,      
  j.Sab,      
  j.Dom,      
  j.Total               
 FROM OPENJSON ( @json )          
  WITH (Articulo  varchar(20),       
        EstacionTrabajo   varchar(255),       
  Lun            float,       
  Mar            float,       
  Mie            float,       
  Jue            float,       
  Vie            float,       
  Sab            float,       
  Dom            float,       
  Total          float) As j         
  WHERE NULLIF(RTRIM(j.Articulo), '') IS NOT NULL        
    OPEN crForecastPlan          
    FETCH NEXT FROM crForecastPlan INTO @Renglon,@Estacion, @Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total       
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN         
   INSERT INTO ForecastPlanSemanalD (ID, Renglon, Estacion, Articulo, Lun, Mar, Mie, Jue, Vie, Sab, Dom, Total)       
                               VALUES  (@PPSID,@Renglon, @Estacion, @Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total)      
                                      IF @@ROWCOUNT = 0 SELECT @Ok = 30110         
      END          
      FETCH NEXT FROM crForecastPlan INTO @Renglon,@Estacion, @Articulo,@Lun,@Mar,@Mie,@Jue,@Vie,@Sab,@Dom,@Total          
    END          
    CLOSE crForecastPlan          
    DEALLOCATE crForecastPlan       
END       
  IF @Ok IS NULL                                              
  BEGIN                                             
    COMMIT TRANSACTION                                
  END ELSE                                              
  BEGIN                                              
  ROLLBACK TRANSACTION                                              
    SELECT @OkRef = RTRIM(Descripcion)+' '+ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok         
  END                                              
  SELECT @Ok         AS Ok,                                             
         @OkRef      AS OkRef      
RETURN       
END      
GO

/**************** spPortalForecastLog ****************/
if exists (select * from sysobjects where id = object_id('dbo.spPortalForecastLog') and type = 'P') DROP PROCEDURE dbo.spPortalForecastLog
GO
CREATE PROCEDURE spPortalForecastLog
                         @Usuario     varchar(10), 
       @Fecha       datetime 
AS BEGIN
SELECT 
    PortalForecastLog.Usuario,
 PortalForecastLog.ID,
 PortalForecastLog.Fecha,
 PortalForecastLog.Proceso, 
 PortalForecastLog.Actividad,
 PortalForecastLog.Historial
FROM PortalForecastLog
 
RETURN 
END 
GO

/**************** spCambiarSituacionFC ****************/
if exists (select * from sysobjects where id = object_id('dbo.spCambiarSituacionFC') and type = 'P') DROP PROCEDURE dbo.spCambiarSituacionFC
GO
CREATE PROCEDURE spCambiarSituacionFC
           @Modulo    char(5),
     @Mov                 varchar(20),
           @ID     int,
     @Situacion   char(50),
     @Usuario    char(10)
AS BEGIN
  DECLARE
    @SituacionSiguiente varchar(50),
    @SituacionFecha  datetime = GETDATE(),
 @Ok              int, 
 @OkRef           varchar(255) 
  BEGIN TRANSACTION
  IF NULLIF(RTRIM(@Situacion), '') IS NULL SELECT @Situacion = ForecastPlanSemanal.Situacion FROM ForecastPlanSemanal WHERE ID = @ID 
  SELECT @SituacionSiguiente =  dbo.fnSituacionSiguienteFC(@Modulo, @Mov, @Situacion)  
  UPDATE ForecastPlanSemanal 
     SET ForecastPlanSemanal.Situacion = @SituacionSiguiente, 
      ForecastPlanSemanal.SituacionUsuario = @Usuario, 
   ForecastPlanSemanal.SItuacionFecha  = @SituacionFecha
 WHERE ForecastPlanSemanal.ID = @ID
 IF @@ROWCOUNT = 0 SELECT @Ok = 10623  
  IF @Ok IS NULL                                
  BEGIN                                
    COMMIT TRANSACTION                                    
  END ELSE                                
  BEGIN                                
    ROLLBACK TRANSACTION                                
    SELECT @OkRef = ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok                                  
  END                        
 SELECT @Ok AS Ok,                             
        @OkRef  AS OkRef 
RETURN 
END 
GO

/**************** spWebArtExplosionMaterial ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArtExplosionMaterial') and type = 'P') DROP PROCEDURE dbo.spWebArtExplosionMaterial
GO
  CREATE PROCEDURE spWebArtExplosionMaterial                         
     @Usuario  varchar(10),                       
     @Ejercicio   int,                      
     @Periodo     int                      
AS BEGIN                           
DECLARE                        
@Empresa        char(5) = 'INCF',                       
@CentroTrabajo  varchar(10),                               
@Articulo     varchar(20),                               
@Descripcion  varchar(100),                                                  
@Total        float,                             
@InventarioP  float,     
@Producir     float,     
@ArticuloHijo    varchar(20),                           
@DescripcionH    varchar(100),                           
@RendimientoH   float,                          
@CantidadH      float,                           
@InvRequeridoH  float,                           
@SeProduce      bit,                       
@FechaMD        datetime,                       
@FechaMA        datetime,                       
@Venta          float,                       
@Disponible     float,                       
@Factorstock    float,                       
@Stock          float,                       
@Produciendo    float,                       
@cVenta         float,                       
@DOH            float,                   
@DiasHabiles    float,             
@Familia        varchar(50),     
@CentroDefaul   varchar(10), 
@ListaAutorizada   bit, 
@ListaAutorizadaSub  bit, 
@EnValidacion        char(5) 
 EXEC spIntToDateTime 1, @Periodo, @Ejercicio, @FechaMD OUTPUT                       
 SELECT @FechaMA = dbo.fnUltimoDiaMes(@FechaMD)                        
DELETE ExplocionMatCF WHERE  Usuario = @Usuario                    
 DECLARE crExplocion CURSOR FOR                           
 SELECT ResumenPlaneacionCF.Articulo,                               
        ResumenPlaneacionCF.Descripcion,                               
        ResumenPlaneacionCF.Venta,       
        ResumenPlaneacionCF.Producir,      
        ISNULL(ResumenPlaneacionCF.InvEmp,0.00) + ISNULL(ResumenPlaneacionCF.InvGra,0.00),                             
        ResumenPlaneacionCF.CtTrabajo,                       
        Art.Factorstock,                   
        CentroFC.DiasHabilies,             
        Art.FamArtCF,     
        Art.CentroDef, 
  Art.ListaAutorizada
 FROM ResumenPlaneacionCF                           
 JOIN Art ON ResumenPlaneacionCF.Articulo = Art.Articulo                      
  LEFT OUTER JOIN CentroFC ON ResumenPlaneacionCF.CtTrabajo = CentroFC.Centro                   
 WHERE ResumenPlaneacionCF.Usuario = @Usuario   
   ORDER BY ResumenPlaneacionCF.ID                             
 OPEN crExplocion                                    
 FETCH NEXT FROM crExplocion INTO @Articulo, @Descripcion, @cVenta, @Producir, @InventarioP, @CentroTrabajo, @Factorstock, @DiasHabiles, @Familia, @CentroDefaul, @ListaAutorizada                                   
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0                                     
   BEGIN                                    
  IF @@FETCH_STATUS <> -2                                     
    BEGIN                             
 SELECT @Venta = NULL, @Disponible = NULL, @Total = NULL, @Stock = NULL                       
    SELECT @Stock  = dbo.fnPorcentaje(@cVenta, @Factorstock)            
 ---SELECT ISNULL(ResumenPlaneacionCF.Venta,0.00) * ISNULL(ResumenPlaneacionCF.Factorstock/100,0)                        
       SELECT  @Venta       = dbo.fnWebVentaFechasAcumFactura(@Empresa, @Articulo, @FechaMD, @FechaMA)                       
       SELECT  @Produciendo = dbo.fnWebArtAcumProduciendoFechas (@Empresa, @Articulo, @FechaMD, @FechaMA)                       
       SELECT @Stock  = dbo.fnPorcentaje(@cVenta, @Factorstock)                       
   --EXEC spArtDisponibleForecast @Empresa, @Articulo,  @Disponible  OUTPUT               
     SELECT  @Disponible = dbo.fnWebArtMaterialDisponible (@Empresa, @Articulo)             
  SELECT @DOH =  ROUND(ISNULL(@Disponible,0.00) / ISNULL(@cVenta,0.00) * @DiasHabiles,0)                      
   SELECT  @Total  = dbo.fnMayor(ISNULL(@cVenta,0.00) - ISNULL(@Venta,0.00) - ISNULL(@Disponible,0.00)  - ISNULL(@Produciendo,0.00) + ISNULL(@Stock,0.00),0)               
      SELECT @ListaAutorizadaSub = 1, @EnValidacion = 'False'
               IF EXISTS(SELECT * FROM ArtMaterial                                     
                   JOIN Art ON Art.Articulo = ArtMaterial.Material                                    
                   WHERE ArtMaterial.Articulo = @Articulo     
                       AND ISNULL(ISNULL(Centro, @CentroDefaul), 0) = @CentroDefaul 
                       AND Art.SeProduce  = 1 
                    AND Art.ListaAutorizada = 0) SELECT @ListaAutorizadaSub = 0
       IF  (@ListaAutorizada = 0 OR  @ListaAutorizadaSub = 0) SELECT @EnValidacion = 'True'
        INSERT INTO ExplocionMatCF(Usuario, ArticuloPadre,DescripcionP,Total,Bandera, Articulo, CentroTrabajo, InventarioP, Nivel, Venta, Produciendo, Planear, 
                              DOH, Stock, StockPorcentaje, FamiliaCF, Forecast, Producir, EnValidacion)                                    
           VALUES (@Usuario, @Articulo,@Descripcion+' - Centro Trabajo: '+ISNULL(@CentroDefaul,''), ROUND(ISNULL(@cVenta,0),0),1,@Articulo, @CentroTrabajo, 
             @Disponible, 1, @Venta, @Produciendo,@Total, @DOH, @Stock, @Factorstock, @Familia, @cVenta, @Producir, @EnValidacion) 
     
 IF  @EnValidacion = 'False'
 BEGIN                           
      DECLARE crMaterial CURSOR FOR                               
     SELECT                               
       DISTINCT(Material),                                    
       Art.Descripcion1,          ArtMaterial.Cantidad,                                             
       ROUND(ISNULL(@Total, 0.00) * ISNULL(Cantidad,0.00),4),                           
       Art.SeProduce                          
     FROM ArtMaterial                                     
     JOIN Art ON Art.Articulo = ArtMaterial.Material                                    
      WHERE ArtMaterial.Articulo = @Articulo     
       AND ISNULL(ISNULL(Centro, @CentroDefaul), 0) = @CentroDefaul    
     OPEN crMaterial                              
     FETCH NEXT FROM crMaterial INTO @ArticuloHijo, @DescripcionH, @CantidadH, @InvRequeridoH, @SeProduce                           
     WHILE @@FETCH_STATUS <> -1                              
     BEGIN                              
       IF @@FETCH_STATUS <> -2                               
       BEGIN                  
     IF @SeProduce = 0                           
     BEGIN                           
     INSERT INTO ExplocionMatCF(ArticuloHijo, Usuario, DescripcionH, Rendimiento,ArticuloPadre,DescripcionP, Articulo, InvRequerido, CentroTrabajo, Nivel, MaterialD, FamiliaCF, SubArticulo)                           
        VALUES     (@ArticuloHijo, @Usuario, @DescripcionH, @CantidadH, @Articulo, @Descripcion, @ArticuloHijo, @InvRequeridoH, @CentroTrabajo, 2, @Articulo, @Familia, @Articulo)                          
     END ELSE                           
     IF @SeProduce = 1                          
     BEGIN                           
     INSERT INTO ExplocionMatCF(ArticuloHijo, Usuario, DescripcionH, Rendimiento,ArticuloPadre,DescripcionP, Articulo, InvRequerido, CentroTrabajo, SubProducto, Nivel, MaterialD, FamiliaCF, SeProduce, SubArticulo)                           
        VALUES     (@ArticuloHijo, @Usuario, @DescripcionH, @CantidadH, @Articulo, @Descripcion, @ArticuloHijo, @InvRequeridoH, @CentroTrabajo, 1, 2, @Articulo, @Familia, 1, @Articulo)                          
       INSERT INTO ExplocionMatCF(ArticuloHijo, Usuario, DescripcionH, Rendimiento,ArticuloPadre,DescripcionP, Articulo, InvRequerido, CentroTrabajo, Nivel, MaterialD, FamiliaCF, SubArticulo)                                    
      SELECT                          
      DISTINCT(Material),                                
      @Usuario,                                 
      Art.Descripcion1,                                 
      ArtMaterial.Cantidad,                                
      @Articulo,                                
      @Descripcion,                        
      ArtMaterial.Material,                                 
      0,                               
      @CentroTrabajo,                         
       3,                         
      @ArticuloHijo,             
      @Familia,   
      @ArticuloHijo  
       FROM ArtMaterial                                     
       JOIN Art ON Art.Articulo = ArtMaterial.Material                                    
     WHERE ArtMaterial.Articulo = @ArticuloHijo       
      --AND ISNULL(ISNULL(Centro, @CentroDefaul), 0) = @CentroDefaul    
       END                              
       END                              
       FETCH NEXT FROM crMaterial INTO @ArticuloHijo, @DescripcionH, @CantidadH, @InvRequeridoH, @SeProduce                              
     END                              
     CLOSE crMaterial                                  
     DEALLOCATE crMaterial                            
     END                    
    END                                    
    FETCH NEXT FROM crExplocion INTO @Articulo, @Descripcion, @cVenta, @Producir, @InventarioP, @CentroTrabajo, @Factorstock, @DiasHabiles, @Familia, @CentroDefaul, @ListaAutorizada                                    
   END                                    
   CLOSE crExplocion                                    
   DEALLOCATE crExplocion                            
RETURN                           
END   
SELECT *FROM ExplocionMatCF WHERE Usuario = 'MASERP' ORDER BY ID ASC
GO

/**************** spWebArtExplosionMatFaltante ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArtExplosionMatFaltante') and type = 'P') DROP PROCEDURE dbo.spWebArtExplosionMatFaltante
GO
CREATE PROCEDURE spWebArtExplosionMatFaltante    
                            @Empresa char(5),     
                            @Usuario varchar(10),     
       @Nivel   int    
AS BEGIN     
DECLARE    
 @Articulo     varchar(20),     
 @Disponible   float,     
 @InvFinal     float,     
 @Faltante     float,     
 @PorAlcance   float,     
 @AlcanceDias  float,     
 @InvRequerido float,     
 @ID           int    
    DECLARE crMaterial CURSOR FOR        
    SELECT      ArticuloHijo,    SUM(ROUND(ISNULL(ARTDISPONIBLEVACA.Disponible,0),4))    FROM (SELECT ExplocionMatCF.ArticuloHijo     
        FROM ExplocionMatCF            
       WHERE ExplocionMatCF.Usuario = @Usuario           
         AND ExplocionMatCF.ArticuloHijo IS NOT NULL        
      AND ExplocionMatCF.Nivel = @Nivel    
    GROUP BY ExplocionMatCF.ArticuloHijo     ) AS subquery   LEFT OUTER JOIN ARTDISPONIBLEVACA ON  ArticuloHijo = ARTDISPONIBLEVACA.Articulo     
                                      AND ARTDISPONIBLEVACA.Empresa = @Empresa     
                                         AND ARTDISPONIBLEVACA.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1) GROUP BY      ArticuloHijo    
    OPEN crMaterial            
    FETCH NEXT FROM crMaterial INTO @Articulo, @Disponible         
    WHILE @@FETCH_STATUS <> -1            
    BEGIN            
      IF @@FETCH_STATUS <> -2             
      BEGIN         
        SELECT @InvFinal = NULL         
   SELECT @InvFinal = @Disponible        
   DECLARE crConsumo CURSOR FOR             
     SELECT ExplocionMatCF.ID,     
         ExplocionMatCF.InvRequerido        
       FROM ExplocionMatCF     
   WHERE ExplocionMatCF.ArticuloHijo = @Articulo         
          AND ExplocionMatCF.Usuario = @Usuario         
          AND ExplocionMatCF.ArticuloHijo IS NOT NULL      
       AND ExplocionMatCF.Nivel = @Nivel    
     ORDER BY ExplocionMatCF.ID ASC         
   OPEN crConsumo            
   FETCH NEXT FROM crConsumo INTO @ID,  @InvRequerido        
   WHILE @@FETCH_STATUS <> -1            
   BEGIN            
    IF @@FETCH_STATUS <> -2             
    BEGIN         
    SELECT @Faltante = 0, @PorAlcance = NULL, @AlcanceDias = NULL          
    IF @InvFinal > = ISNULL(@InvRequerido,0.00) SELECT @Faltante = 0.00 ELSE         
    IF @InvFinal <  @InvRequerido SELECT @Faltante = @InvRequerido - @InvFinal        
    SELECT @PorAlcance = ROUND(((@InvFinal / NULLIF(@InvRequerido,0))),2),         
           @AlcanceDias = @AlcanceDias        
     UPDATE ExplocionMatCF SET  InvH = @InvFinal,         
                                PorAlcance = @PorAlcance,         
           AlcanceDias=(ISNULL(@PorAlcance,0.00) *26)        
         WHERE ID = @ID         
     SELECT @InvFinal = dbo.fnMayor(ISNULL(@InvFinal,0.00) - ISNULL(@InvRequerido,0.00),0.0)        
     UPDATE ExplocionMatCF         
            SET Faltante = ISNULL(@Faltante,0.00),          
                   InvFinal = @InvFinal        
            WHERE ExplocionMatCF.ID = @ID         
    END            
    FETCH NEXT FROM crConsumo INTO @ID,  @InvRequerido           
   END            
   CLOSE crConsumo            
   DEALLOCATE crConsumo         
      END            
      FETCH NEXT FROM crMaterial INTO @Articulo, @Disponible            
    END            
    CLOSE crMaterial            
    DEALLOCATE crMaterial        
RETURN    
END     
GO

/**************** spWebForecastArribos12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastArribos12') and type = 'P') DROP PROCEDURE dbo.spWebForecastArribos12
GO
CREATE PROCEDURE [dbo].[spWebForecastArribos12]                         
            @Usuario      varchar(10)      
AS BEGIN   
DECLARE      
 @Ceros           bit = 0,    
 @Familia         varchar(50),
 @ID              int,     
 @Disponible     float,     
 @Empresa     char(5) = 'INCF',       
 @Articulo1   varchar(20),      
 @Articulo2   varchar(20),      
 @Articulo3   varchar(20),       
 @SeProduce   bit,       
 @MatCantidad  float,         
 @S1          float,      
 @S2          float,      
 @S3          float,      
 @S4          float,      
 @S5          float,      
 @S6          float,       
 @S7          float,      
 @S8          float,      
 @S9          float,      
 @S10         float,      
 @S11         float,      
 @S12         float,      
 @A1          float,      
 @A2          float,      
 @A3          float,      
 @A4          float,      
 @A5          float,      
 @A6          float,       
 @A7          float,      
 @A8          float,      
 @A9          float,      
 @A10         float,      
 @A11         float,      
 @A12         float,     
 @S21          float,      
 @S22          float,      
 @S23          float,      
 @S24          float,      
 @S25          float,      
 @S26          float,       
 @S27          float,      
 @S28          float,      
 @S29          float,      
 @S210         float,      
 @S211         float,      
 @S212         float,        
    @_S1_FI datetime,       
    @_S1_FF datetime,      
    @_S2_FI datetime,       
    @_S2_FF datetime,      
    @_S3_FI datetime,       
    @_S3_FF datetime,      
    @_S4_FI datetime,       
    @_S4_FF datetime,      
    @_S5_FI datetime,       
    @_S5_FF datetime,      
    @_S6_FI datetime,       
    @_S6_FF datetime,      
    @_S7_FI datetime,       
    @_S7_FF datetime,      
    @_S8_FI datetime,       
    @_S8_FF datetime,      
    @_S9_FI datetime,       
    @_S9_FF datetime,      
    @_S10_FI datetime,       
    @_S10_FF datetime,      
    @_S11_FI datetime,       
    @_S11_FF datetime,      
    @_S12_FI datetime,       
    @_S12_FF datetime,       
    @FechaEmision datetime = dbo.fnFechaSinHora(GETDATE())       
 SELECT @_S1_FI  = CalendarioFC.FechaD, @_S1_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 1       
 SELECT @_S2_FI  = CalendarioFC.FechaD, @_S2_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 2       
 SELECT @_S3_FI  = CalendarioFC.FechaD, @_S3_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 3       
 SELECT @_S4_FI  = CalendarioFC.FechaD, @_S4_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 4       
 SELECT @_S5_FI  = CalendarioFC.FechaD, @_S5_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 5       
 SELECT @_S6_FI  = CalendarioFC.FechaD, @_S6_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 6      
 SELECT @_S7_FI  = CalendarioFC.FechaD, @_S7_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 7      
 SELECT @_S8_FI  = CalendarioFC.FechaD, @_S8_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 8       
 SELECT @_S9_FI  = CalendarioFC.FechaD, @_S9_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 9       
 SELECT @_S10_FI = CalendarioFC.FechaD, @_S10_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 10       
 SELECT @_S11_FI = CalendarioFC.FechaD, @_S11_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 11      
 SELECT @_S12_FI = CalendarioFC.FechaD, @_S12_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 12       
CREATE TABLE #Arribos12S (          
        ID                       int    NOT NULL IDENTITY(1,1),  
  Familia            varchar(50) COLLATE Database_Default NULL,    
  Articulo                 varchar(20) COLLATE Database_Default NULL,      
        Articulo1                varchar(20) COLLATE Database_Default NULL,      
  Articulo2                varchar(20) COLLATE Database_Default NULL,      
  Articulo3                varchar(20) COLLATE Database_Default NULL,      
  S1                       float NULL,       
  S2                       float NULL,       
  S3                       float NULL,       
  S4                       float NULL,       
  S5                       float NULL,       
  S6                       float NULL,       
  S7                       float NULL,       
  S8                       float NULL,       
  S9                       float NULL,       
  S10                      float NULL,       
  S11                      float NULL,    S12                      float NULL)      
CREATE TABLE #ArribosT (          
  ID                       int    NOT NULL IDENTITY(1,1),        
  Familia                  varchar(20)  COLLATE Database_Default NULL,      
  Articulo                 varchar(20)  COLLATE Database_Default NULL,      
  Descripcion              varchar(100) COLLATE Database_Default NULL,      
  S1                       float NULL,       
  A1                       float NULL,      
  S2                       float NULL,       
  A2                       float NULL,       
  S3                       float NULL,      
  A3                       float NULL,       
  S4                       float NULL,      
  A4                       float NULL,       
  S5                       float NULL,       
  A5                       float NULL,       
  S6                       float NULL,       
  A6                       float NULL,       
  S7                       float NULL,       
  A7                       float NULL,       
  S8                       float NULL,       
  A8                       float NULL,       
  S9                       float NULL,       
  A9                       float NULL,       
  S10                      float NULL,       
  A10                      float NULL,       
  S11                      float NULL,        
  A11                      float NULL,         
  S12                      float NULL,       
  A12                      float NULL)      
  CREATE TABLE #ArriboDisponible (          
  ID                       int    NOT NULL IDENTITY(1,1),        
  Familia                  varchar(20)  COLLATE Database_Default NULL,      
  Articulo                 varchar(20)  COLLATE Database_Default NULL,      
  Descripcion              varchar(100) COLLATE Database_Default NULL,      
  Disponible               float NULL,     
  DiasInventario           float NULL,    
  S1                       float NULL,       
  A1                       float NULL,       
  IF1                      float NULL,     
  S2                       float NULL,       
  A2                       float NULL,       
  IF2                      float NULL,     
  S3                       float NULL,      
  A3                       float NULL,      
  IF3                      float NULL,     
  S4                       float NULL,      
  A4                       float NULL,      
  IF4                      float NULL,     
  S5                       float NULL,       
  A5                       float NULL,       
  IF5   float NULL,     
  S6                       float NULL,       
  A6                       float NULL,     
  IF6                      float NULL,     
  S7                       float NULL,       
  A7                       float NULL,     
  IF7                      float NULL,     
  S8        float NULL,       
  A8                       float NULL,       
  IF8                      float NULL,     
  S9                       float NULL,       
  A9                       float NULL,      
  IF9                      float NULL,     
  S10                      float NULL,       
  A10                      float NULL,     
  IF10                     float NULL,     
  S11                      float NULL,        
  A11                      float NULL,      
  IF11                     float NULL,     
  S12                      float NULL,    
  A12                      float NULL,     
  IF12                     float NULL)      
 DELETE #ArribosT     
 DELETE #ArriboDisponible  
    DECLARE crArticulo CURSOR FOR           
        SELECT Art.FamArtCF,Arribos12.Articulo, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12      
         FROM Arribos12       
   JOIN Art ON Arribos12.Articulo = Art.Articulo      
  WHERE (ISNULL(S1,0.00) <> 0.00 OR ISNULL(S2,0.00)  <> 0.00 OR ISNULL(S3,0.00)  <> 0.00 OR ISNULL(S4,0.00)  <> 0.00 OR       
            ISNULL(S5,0.00) <> 0.00 OR ISNULL(S6,0.00)  <> 0.00 OR ISNULL(S7,0.00)  <> 0.00 OR ISNULL(S8,0.00)  <> 0.00 OR      
            ISNULL(S9,0.00) <> 0.00 OR ISNULL(S10,0.00) <> 0.00 OR ISNULL(S11,0.00) <> 0.00 OR ISNULL(S12,0.00) <> 0.00 )   
 AND Arribos12.Usuario = @Usuario   
    OPEN crArticulo          
    FETCH NEXT FROM crArticulo INTO @Familia, @Articulo1, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12       
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN           
  DECLARE crMaterial CURSOR FOR        
  SELECT       
        DISTINCT(Material),        
        ISNULL(ArtMaterial.Cantidad,0.00),       
  Art.SeProduce,       
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S1,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S2,0.0),0),          
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S3,0.0),0),         
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S4,0.0),0),       
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S5,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S6,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S7,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S8,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S9,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S10,0.0),0),       
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S11,0.0),0),      
   ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S12,0.0),0)      
      FROM ArtMaterial               
      JOIN Art ON Art.Articulo = ArtMaterial.Material              
      WHERE ArtMAterial.Articulo = @Articulo1      
    OPEN crMaterial          
    FETCH NEXT FROM crMaterial INTO @Articulo2, @MatCantidad, @SeProduce, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212       
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN          
        IF @SeProduce = 0       
     BEGIN       
        INSERT INTO #Arribos12S (Familia, Articulo, Articulo1, Articulo2, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12)        
     VALUES (@Familia, @Articulo2, @Articulo1, @Articulo2, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212)       
     END ELSE       
     INSERT INTO #Arribos12S (Articulo3, Familia, Articulo2, Articulo1, Articulo, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12)        
   SELECT       
    DISTINCT(Material),   
 @Familia, 
    @Articulo2,       
    @Articulo1,       
    Material,       
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S21,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S22,0.0),0),          
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S23,0.0),0),         
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S24,0.0),0),       
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S25,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S26,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S27,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S28,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S29,0.0),0),      
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S210,0.0),0),       
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S211,0.0),0),    
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S212,0.0),0)      
   FROM ArtMaterial               
   JOIN Art ON Art.Articulo = ArtMaterial.Material              
   WHERE ArtMAterial.Articulo = @Articulo2                       
      END          
      FETCH NEXT FROM crMaterial INTO @Articulo2, @MatCantidad, @SeProduce, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212          
    END          
    CLOSE crMaterial          
    DEALLOCATE crMaterial       
      END          
      FETCH NEXT FROM crArticulo INTO @Familia, @Articulo1, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12         
    END          
    CLOSE crArticulo          
    DEALLOCATE crArticulo    
 
INSERT INTO #ArribosT(Familia, Articulo, Descripcion, S1, A1,       
                                             S2, A2,       
            S3, A3,       
            S4, A4,       
            S5, A5,       
            S6, A6,       
            S7, A7,      
            S8, A8,       
            S9, A9,       
            S10, A10,       
            S11, A11,       
            S12, A12)       
       SELECT  
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN #Arribos12S.Familia  ELSE  NULL END,   
     #Arribos12S.Articulo,       
  Art.Descripcion1,       
  SUM(ISNULL(S1,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S1_FI, @_S1_FF),       
  SUM(ISNULL(S2,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S2_FI, @_S2_FF),       
  SUM(ISNULL(S3,0.00)),        
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S3_FI, @_S3_FF),       
  SUM(ISNULL(S4,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S4_FI, @_S4_FF),       
  SUM(ISNULL(S5,0.00)),        
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S5_FI, @_S5_FF),       
  SUM(ISNULL(S6,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S6_FI, @_S6_FF),       
  SUM(ISNULL(S7,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S7_FI, @_S7_FF),       
  SUM(ISNULL(S8,0.00)),      
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S8_FI, @_S8_FF),       
  SUM(ISNULL(S9,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S9_FI, @_S9_FF),       
  SUM(ISNULL(S10,0.00)),        
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S10_FI, @_S10_FF),       
  SUM(ISNULL(S11,0.00)),       
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S11_FI, @_S11_FF),       
  SUM(ISNULL(S12,0.00)),        
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S12_FI, @_S12_FF)       
    FROM #Arribos12S      
      JOIN Art ON #Arribos12S.Articulo = Art.Articulo       
      JOIN Art ArtFamilia ON #Arribos12S.Articulo1 = ArtFamilia.Articulo       
       GROUP BY       
     #Arribos12S.Articulo,       
     Art.Descripcion1, 
    CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN #Arribos12S.Familia  ELSE  NULL END  
 INSERT INTO #ArriboDisponible (Familia, Articulo, Descripcion, Disponible, S1, A1,     
                                                                   S2, A2,     
                   S3, A3,     
                   S4, A4,     
                   S5, A5,     
                   S6, A6,     
                   S7, A7,     
                   S8, A8,     
                   S9, A9,     
                   S10, A10,    
                   S11, A11,    
                   S12, A12)      
    SELECT 
  #ArribosT.Familia,   
  #ArribosT.Articulo,       
  #ArribosT.Descripcion,      
  ROUND(SUM(ISNULL(ARTDISPONIBLEVACA.Disponible,0.00)),0)  AS Disponible,        
  #ArribosT.S1,       
  #ArribosT.A1,      
  #ArribosT.S2,       
  #ArribosT.A2,      
  #ArribosT.S3,      
  #ArribosT.A3,      
  #ArribosT.S4,      
  #ArribosT.A4,       
  #ArribosT.S5,       
  #ArribosT.A5,      
  #ArribosT.S6,       
  #ArribosT.A6,       
  #ArribosT.S7,       
  #ArribosT.A7,       
  #ArribosT.S8,       
     #ArribosT.A8,       
  #ArribosT.S9,       
  #ArribosT.A9,       
  #ArribosT.S10,       
  #ArribosT.A10,      
  #ArribosT.S11,       
  #ArribosT.A11,       
  #ArribosT.S12,       
  #ArribosT.A12      
   FROM #ArribosT      
   LEFT OUTER JOIN  ARTDISPONIBLEVACA ON #ArribosT.Articulo = ARTDISPONIBLEVACA.Articulo       
                                     AND ARTDISPONIBLEVACA.Empresa = @Empresa       
          AND ARTDISPONIBLEVACA.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)        
 GROUP BY   
  #ArribosT.Familia,  
  #ArribosT.Articulo,       
  #ArribosT.Descripcion,        
  #ArribosT.S1,       
  #ArribosT.A1,      
  #ArribosT.S2,       
  #ArribosT.A2,      
  #ArribosT.S3,      
  #ArribosT.A3,      
  #ArribosT.S4,      
  #ArribosT.A4,       
  #ArribosT.S5,       
  #ArribosT.A5,      
  #ArribosT.S6,       
  #ArribosT.A6,       
  #ArribosT.S7,       
  #ArribosT.A7,       
  #ArribosT.S8,       
  #ArribosT.A8,       
  #ArribosT.S9,       
  #ArribosT.A9,       
  #ArribosT.S10,       
  #ArribosT.A10,      
  #ArribosT.S11,       
  #ArribosT.A11,       
  #ArribosT.S12,       
  #ArribosT.A12      
    DECLARE crDisponible CURSOR FOR         
   SELECT ID,     
   ISNULL(Disponible,0.00),     
   ISNULL(S1,0.00),     
   ISNULL(S2,0.00),     
   ISNULL(S3,0.00),     
   ISNULL(S4,0.00),     
   ISNULL(S5,0.00),     
   ISNULL(S6,0.00),     
   ISNULL(S7,0.00),     
   ISNULL(S8,0.00),     
   ISNULL(S9,0.00),     
   ISNULL(S10,0.00),     
   ISNULL(S11,0.00),     
   ISNULL(S12,0.00),     
   ISNULL(A1,0.00),     
   ISNULL(A2,0.00),     
   ISNULL(A3,0.00),     
   ISNULL(A4,0.00),     
   ISNULL(A5,0.00),     
   ISNULL(A6,0.00),     
   ISNULL(A7,0.00),     
   ISNULL(A8,0.00),     
   ISNULL(A9,0.00),     
   ISNULL(A10,0.00),     
   ISNULL(A11,0.00),     
   ISNULL(A12,0.00)     
       FROM #ArriboDisponible    
    OPEN crDisponible        
    FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12    
    WHILE @@FETCH_STATUS <> -1        
    BEGIN        
      IF @@FETCH_STATUS <> -2         
      BEGIN       
  IF  @Ceros = 0     
  BEGIN     
   UPDATE #ArriboDisponible SET IF1  = ISNULL(@Disponible,0.00) - ISNULL(@S1,0.00) + ISNULL(@A1,0.00) WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF2  = ISNULL(IF1,0.00)  - ISNULL(@S2,0.00)  + ISNULL(@A2,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF3  = ISNULL(IF2,0.00)  - ISNULL(@S3,0.00)  + ISNULL(@A3,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF4  = ISNULL(IF3,0.00)  - ISNULL(@S4,0.00)  + ISNULL(@A4,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF5  = ISNULL(IF4,0.00)  - ISNULL(@S5,0.00)  + ISNULL(@A5,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF6  = ISNULL(IF5,0.00)  - ISNULL(@S6,0.00)  + ISNULL(@A6,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF7  = ISNULL(IF6,0.00)  - ISNULL(@S7,0.00)  + ISNULL(@A7,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF8  = ISNULL(IF7,0.00)  - ISNULL(@S8,0.00)  + ISNULL(@A8,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF9  = ISNULL(IF8,0.00)  - ISNULL(@S9,0.00)  + ISNULL(@A9,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF10 = ISNULL(IF9,0.00)  - ISNULL(@S10,0.00) + ISNULL(@A10,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF11 = ISNULL(IF10,0.00) - ISNULL(@S11,0.00) + ISNULL(@A11,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF12 = ISNULL(IF11,0.00) - ISNULL(@S12,0.00) + ISNULL(@A12,0.00)  WHERE ID = @ID     
 END ELSE     
   UPDATE #ArriboDisponible SET IF1  = ISNULL(@Disponible,0.00) - ISNULL(@S1,0.00) + ISNULL(@A1,0.00) WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF2  = ISNULL(IF1,0.00)  - ISNULL(@S2,0.00)  + ISNULL(@A2,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF3  = ISNULL(IF2,0.00)  - ISNULL(@S3,0.00)  + ISNULL(@A3,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF4  = ISNULL(IF3,0.00)  - ISNULL(@S4,0.00)  + ISNULL(@A4,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF5  = ISNULL(IF4,0.00)  - ISNULL(@S5,0.00)  + ISNULL(@A5,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF6  = ISNULL(IF5,0.00)  - ISNULL(@S6,0.00)  + ISNULL(@A6,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF7  = ISNULL(IF6,0.00)  - ISNULL(@S7,0.00)  + ISNULL(@A7,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF8  = ISNULL(IF7,0.00)  - ISNULL(@S8,0.00)  + ISNULL(@A8,0.00)  WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF9  = ISNULL(IF8,0.00)  - ISNULL(@S9,0.00)  + ISNULL(@A9,0.00)   WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF10 = ISNULL(IF9,0.00)  - ISNULL(@S10,0.00) + ISNULL(@A10,0.00) WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF11 = ISNULL(IF10,0.00) - ISNULL(@S11,0.00) + ISNULL(@A11,0.00) WHERE ID = @ID     
   UPDATE #ArriboDisponible SET IF12 = ISNULL(IF11,0.00) - ISNULL(@S12,0.00) + ISNULL(@A12,0.00)  WHERE ID = @ID     
      END        
      FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12       
    END        
    CLOSE crDisponible        
    DEALLOCATE crDisponible     
  SELECT     
  ID,        
  #ArriboDisponible.Familia,      
  #ArriboDisponible.Articulo,      
  Descripcion,    
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN 'MATERIA PRIMA'  ELSE  'INSUMO' END Grupo,     
  Disponible,     
  ISNULL(NULLIF(ROUND((ISNULL(Disponible,0.00)/NULLIF(IF1,0.00)) * 4,0),0),0) AS DiasInventario,     
  S1 ,      
  A1 ,      
  IF1,    
  S2 ,      
  A2 ,      
  IF2,    
  S3 ,     
  A3 ,     
  IF3,    
  S4 ,     
  A4 ,     
  IF4,    
  S5 ,      
  A5 ,      
  IF5,    
  S6 ,      
  A6 ,    
  IF6,    
  S7 ,      
  A7 ,    
  IF7,    
  S8 ,      
  A8 ,      
  IF8,    
  S9 ,      
  A9 ,     
  IF9,    
  S10,      
  A10,    
  IF10,     
  S11,       
  A11,     
  IF11,     
  S12,    
  A12,    
  IF12     
  FROM #ArriboDisponible    
  JOIN Art ON #ArriboDisponible.Articulo = Art.Articulo  
  ORDER BY Grupo DESC , Familia ASC
RETURN       
END    
GO

/**************** spWebForecastGuardar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastGuardar') and type = 'P') DROP PROCEDURE dbo.spWebForecastGuardar
GO
CREATE PROCEDURE spWebForecastGuardar         
        @Usuario    varchar(10),         
        @Ejercicio  int,          
        @Periodo    int        
AS BEGIN         
DECLARE         
@ID           int,       
@MovID        varchar(20),     
@FechaTrabajo datetime = dbo.fnFechaSinHora(GETDATE()),         
@Empresa      char(5)  = 'INCF',        
@Ok           int,       
@OkRef        varchar(255)   
EXEC spWebInicio @Usuario = @Usuario, 
                 @Ejercicio = @Ejercicio, 
     @Periodo = @Periodo, 
     @Historico  = 0, 
     @EnSilencio = 1  
SELECT @MovID = 'V'+LTRIM(RTRIM(CONVERT(varchar(20),ISNULL(CONVERT(int,MAX(dbo.fnRellenarCerosIzquierda(REPLACE(ForecastHist.MovID, 'V',''),2))),0) + 1)))    
  FROM ForecastHist     
 WHERE ForecastHist.Ejercicio = @Ejercicio    
   AND ForecastHist.Periodo   = @Periodo    
   AND ForecastHist.Empresa   = @Empresa    
INSERT INTO ForecastHist (Empresa, FechaEmision, UltimoCambio, Ejercicio, Periodo, Usuario,  MovID)         
                 VALUES (@Empresa, @FechaTrabajo, GETDATE(), @Ejercicio, @Periodo, @Usuario,@MovID)         
      SELECT @ID = SCOPE_IDENTITY()         
INSERT INTO WebInicioHist (ID,CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,DiasHAbiles,        
                           DiasTextra,CapacidadHrs, HorasProgram,PorOcupacion,Maq1,Maq2,Familia,centro, Inventario)         
SELECT @ID,CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,DiasHAbiles,        
                           DiasTextra,CapacidadHrs, HorasProgram,PorOcupacion,Maq1,Maq2,Familia,centro, Inventario        
    FROM         
     WebInicio        
     WHERE Usuario = @Usuario         
INSERT INTO ResumenPlaneacionCFHist (ID,Renglon,Usuario,Prioridad,CtTrabajo,Ejercicio,Concepto,Articulo,Descripcion,Cliente,NombreCte,Programa,        
          S1,P1,S2,P2,S3,P3,S4,P4,S5,P5,S6,P6,S7,P7,S8,P8,S9,P9,S10,P10,        
          S11,P11,S12,P12,S13,P13,S14,P14,S15,P15,S16,P16,S17,P17,S18,P18,S19,P19,S20,P20,        
          S21,P21,S22,P22,S23,P23,S24,P24,S25,P25,S26,P26,S27,P27,S28,P28,S29,P29,S30,P30,        
          S31,P31,S32,P32,S33,P33,S34,P34,S35,P35,S36,P36,S37,P37,S38,P38,S39,P39,S40,P40,        
          S41,P41,S42,P42,S43,P43,S44,P44,S45,P45,S46,P46,S47,P47,S48,P48,S49,P49,S50,P50,        
          S51,P51,S52,P52,S53,P53,S54,P54,Venta,        
          Stock,InvEmp,InvGra,TotalInv,Producir,Gramaje,Kg,Familia,FamiliaCF,VariedadCF,Stok15, Factorstock)          
        SELECT        
             @ID,ID,Usuario,Prioridad,CtTrabajo,Ejercicio,Concepto,Articulo,Descripcion,Cliente,NombreCte,Programa,        
          S1,P1,S2,P2,S3,P3,S4,P4,S5,P5,S6,P6,S7,P7,S8,P8,S9,P9,S10,P10,        
          S11,P11,S12,P12,S13,P13,S14,P14,S15,P15,S16,P16,S17,P17,S18,P18,S19,P19,S20,P20,        
          S21,P21,S22,P22,S23,P23,S24,P24,S25,P25,S26,P26,S27,P27,S28,P28,S29,P29,S30,P30,        
          S31,P31,S32,P32,S33,P33,S34,P34,S35,P35,S36,P36,S37,P37,S38,P38,S39,P39,S40,P40,        
          S41,P41,S42,P42,S43,P43,S44,P44,S45,P45,S46,P46,S47,P47,S48,P48,S49,P49,S50,P50,        
          S51,P51,S52,P52,S53,P53,S54,P54,Venta,        
          Stock,InvEmp,InvGra,TotalInv,Producir,Gramaje,Kg,Familia,FamiliaCF,VariedadCF,Stok15, Factorstock        
        FROM ResumenPlaneacionCF        
        WHERE         
            Usuario = @Usuario        
      ORDER BY ResumenPlaneacionCF.ID      
INSERT INTO CentroFCHist (ID, Usuario,Centro,Descripcion,Estatus,DiasHabilies,DiasTiempoExtra,HorasDia,Eficiencia,Tipo)  
      SELECT @ID, Usuario,Centro,Descripcion,Estatus,DiasHabilies,DiasTiempoExtra,HorasDia,Eficiencia,Tipo   
       FROM CentroFCTemp  
       WHERE CentroFCTemp.Usuario = @Usuario   
INSERT INTO EstacionTFCHist(ID,Usuario,Estacion,Centro,Descripcion,Estatus,BolsasxMinutos,TiempoLimpieza,TiempoComida,TiempoCambiosBobina,  
                           TiempoCambioEnfardadora,CapacidadtnHora,CambioMallas,Turnos,HorasTurnos,CambiosBolsaPresentacion,CambiosVariedad,CapDiaCr)  
       SELECT @ID, Usuario,Estacion,Centro,Descripcion,Estatus,BolsasxMinutos,TiempoLimpieza,TiempoComida,TiempoCambiosBobina,  
                   TiempoCambioEnfardadora,CapacidadtnHora,CambioMallas,Turnos,HorasTurnos,CambiosBolsaPresentacion,CambiosVariedad,CapDiaCr   
        FROM EstacionTFCTemp  
       WHERE EstacionTFCTemp.Usuario = @Usuario    
INSERT INTO BalanceFCHist(ID,Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente,   
                          NombreCte, Programa, Venta,Producir, Familia, VentaT, ProducirT, Inventario, InventarioT)  
                  SELECT @ID,Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente,   
              NombreCte, Programa, Venta,Producir, Familia, VentaT, ProducirT, Inventario, InventarioT  
           FROM BalanceFC  
          WHERE BalanceFC.Usuario = @Usuario  
  SELECT @Ok     AS Ok,       
         @OkRef AS OkRef       
RETURN         
END  
GO

/**************** spWebForecastCargarHist ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastCargarHist') and type = 'P') DROP PROCEDURE dbo.spWebForecastCargarHist
GO
CREATE PROCEDURE spWebForecastCargarHist      
                       @Usuario    varchar(10),     
                       @ID         int  
AS BEGIN   
 DECLARE     
  @PrimerSemana int,       
  @NoSemanas    int ,   
  @Ejercicio    int,   
  @Periodo      int  
  SELECT @Periodo  = ForecastHist.Periodo,   
        @Ejercicio = ForecastHist.Ejercicio   
 FROM ForecastHist WHERE   
      ForecastHist.ID = @ID   
DELETE ResumenPlaneacionCF WHERE Usuario = @Usuario    
DELETE WebInicio           WHERE Usuario = @Usuario 
DELETE CentroFCTemp        WHERE Usuario = @Usuario 
DELETE EstacionTFCTemp     WHERE Usuario = @Usuario
DELETE BalanceFC           WHERE Usuario = @Usuario 
INSERT INTO ResumenPlaneacionCF (Usuario,Prioridad,CtTrabajo,Ejercicio,Concepto,Articulo,Descripcion,Cliente,NombreCte,Programa,    
          S1,P1,S2,P2,S3,P3,S4,P4,S5,P5,S6,P6,S7,P7,S8,P8,S9,P9,S10,P10,    
          S11,P11,S12,P12,S13,P13,S14,P14,S15,P15,S16,P16,S17,P17,S18,P18,S19,P19,S20,P20,    
          S21,P21,S22,P22,S23,P23,S24,P24,S25,P25,S26,P26,S27,P27,S28,P28,S29,P29,S30,P30,    
          S31,P31,S32,P32,S33,P33,S34,P34,S35,P35,S36,P36,S37,P37,S38,P38,S39,P39,S40,P40,    
          S41,P41,S42,P42,S43,P43,S44,P44,S45,P45,S46,P46,S47,P47,S48,P48,S49,P49,S50,P50,    
          S51,P51,S52,P52,S53,P53,S54,P54,Venta,    
          Stock,InvEmp,InvGra,TotalInv,Producir,Gramaje,Kg,Familia,FamiliaCF,VariedadCF,Stok15, Factorstock)      
        SELECT    
             @Usuario,Prioridad,CtTrabajo,Ejercicio,Concepto,Articulo,Descripcion,Cliente,NombreCte,Programa,    
          S1,P1,S2,P2,S3,P3,S4,P4,S5,P5,S6,P6,S7,P7,S8,P8,S9,P9,S10,P10,    
          S11,P11,S12,P12,S13,P13,S14,P14,S15,P15,S16,P16,S17,P17,S18,P18,S19,P19,S20,P20,    
          S21,P21,S22,P22,S23,P23,S24,P24,S25,P25,S26,P26,S27,P27,S28,P28,S29,P29,S30,P30,    
          S31,P31,S32,P32,S33,P33,S34,P34,S35,P35,S36,P36,S37,P37,S38,P38,S39,P39,S40,P40,    
          S41,P41,S42,P42,S43,P43,S44,P44,S45,P45,S46,P46,S47,P47,S48,P48,S49,P49,S50,P50,    
          S51,P51,S52,P52,S53,P53,S54,P54,Venta,    
          Stock,InvEmp,InvGra,TotalInv,Producir,Gramaje,Kg,Familia,FamiliaCF,VariedadCF,Stok15, Factorstock    
        FROM ResumenPlaneacionCFHist    
        WHERE     
            ResumenPlaneacionCFHist.ID  = @ID  
   INSERT INTO WebInicio (Usuario,CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,DiasHAbiles,    
                                   DiasTextra,CapacidadHrs, HorasProgram,PorOcupacion,Maq1,Maq2,Familia,centro, Inventario)     
         SELECT @Usuario,    
                WebInicioHist.CentroTrabajo,    
                WebInicioHist.Venta,    
    WebInicioHist.AProducir,    
    WebInicioHist.TiempoExtra,    
    WebInicioHist.Ocupacion,    
    WebInicioHist.PzasLibres,    
    WebInicioHist.DiasHAbiles,    
                WebInicioHist.DiasTextra,    
    WebInicioHist.CapacidadHrs,     
    WebInicioHist.HorasProgram,    
    WebInicioHist.PorOcupacion,    
    WebInicioHist.Maq1,    
    WebInicioHist.Maq2,    
    WebInicioHist.Familia,    
    WebInicioHist.centro,   
 WebInicioHist.Inventario  
     FROM     
       WebInicioHist    
    WHERE WebInicioHist.ID  = @ID     
 INSERT INTO CentroFCTemp (Usuario,Centro,Descripcion,Estatus,DiasHabilies,DiasTiempoExtra,HorasDia,Eficiencia,Tipo)
      SELECT @Usuario,Centro,Descripcion,Estatus,DiasHabilies,DiasTiempoExtra,HorasDia,Eficiencia,Tipo 
       FROM CentroFCHist
       WHERE CentroFCHist.ID = @ID 
INSERT INTO EstacionTFCTemp (Usuario,Estacion,Centro,Descripcion,Estatus,BolsasxMinutos,TiempoLimpieza,TiempoComida,TiempoCambiosBobina,
                           TiempoCambioEnfardadora,CapacidadtnHora,CambioMallas,Turnos,HorasTurnos,CambiosBolsaPresentacion,CambiosVariedad,CapDiaCr)
       SELECT @Usuario,Estacion,Centro,Descripcion,Estatus,BolsasxMinutos,TiempoLimpieza,TiempoComida,TiempoCambiosBobina,TiempoCambioEnfardadora,
            CapacidadtnHora,CambioMallas,Turnos,HorasTurnos,CambiosBolsaPresentacion,CambiosVariedad,CapDiaCr 
        FROM EstacionTFCHist
       WHERE EstacionTFCHist.ID = @ID 
INSERT INTO BalanceFC (Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente, 
                       NombreCte, Programa, Venta,Producir, Familia, VentaT, ProducirT, Inventario, InventarioT)
               SELECT @Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente, 
              NombreCte, Programa, Venta,Producir, Familia, VentaT, ProducirT, Inventario, InventarioT
      FROM BalanceFCHist
     WHERE BalanceFCHist.ID  = @ID  
 SELECT @PrimerSemana = MIN(DIM_TIEMPO_SEMANA.SEMANA),     
        @NoSemanas    = COUNT(DIM_TIEMPO_SEMANA.SEMANA)      
   FROM DIM_TIEMPO_SEMANA     
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio      
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo    
  SELECT @PrimerSemana AS PrimerSemana,     
         @NoSemanas    AS NumeroSemanas,   
   dbo.fnMesNumeroNombre(@Periodo) AS NombreMes  
RETURN     
END     
GO

/**************** ProgProdSemillasNukA ****************/
if exists (select * from sysobjects where id = object_id('dbo.ProgProdSemillasNukA') and type = 'P') DROP PROCEDURE dbo.ProgProdSemillasNukA
GO
CREATE PROCEDURE ProgProdSemillasNukA        
          @Usuario   varchar(10)        
AS BEGIN        
  DECLARE         
  @CtTrabajo     varchar(25),        
  @TVenta        money,        
  @TAProducir    float,        
  @TTiempoExtra  float,        
  @TOcupacion    float,        
  @TPzasLibres   float,        
  @TotalHrsCap   float,        
  @CapRealTotal  float,      
  @CapacidadPzas float,          
  @CapacidadHras float         
 DELETE ProgramaProdSemillasA WHERE Usuario = @Usuario        
  INSERT INTO ProgramaProdSemillasA(Usuario, CentroTrabajo,Venta,AProducir)        
  SELECT @Usuario,   
         ISNULL(BalanceFC.CtTrabajo, 'SIN CENTRO'),  
   SUM(ISNULL(BalanceFC.Venta,0)),  
   SUM(ISNULL(BalanceFC.Producir,0))  
   FROM BalanceFC          
  WHERE BalanceFC.Usuario = @Usuario         
  GROUP BY CtTrabajo     
    DECLARE crCentroCap CURSOR FOR           
     SELECT ProgramaProdSemillasA.CentroTrabajo    
   FROM  ProgramaProdSemillasA   
  WHERE  ProgramaProdSemillasA.Usuario = @Usuario     
   GROUP BY ProgramaProdSemillasA.CentroTrabajo  
    OPEN crCentroCap          
    FETCH NEXT FROM crCentroCap INTO @CtTrabajo       
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN         
   SELECT @CapacidadHras = NULL, @CapacidadPzas = NULL       
         EXEC spFCCentroCapacidadReal @Usuario, @CtTrabajo, @CapacidadHras OUTPUT, @CapacidadPzas OUTPUT    
        UPDATE ProgramaProdSemillasA   
     SET ProgramaProdSemillasA.CapacidadHrs  = @CapacidadHras,   
         ProgramaProdSemillasA.Ocupacion     = @CapacidadPzas     
   WHERE ProgramaProdSemillasA.CentroTrabajo = @CtTrabajo   
     AND ProgramaProdSemillasA.Usuario       = @Usuario     
      END          
      FETCH NEXT FROM crCentroCap INTO @CtTrabajo         
    END          
    CLOSE crCentroCap          
    DEALLOCATE crCentroCap    
 DECLARE cRProdSemillasNukA CURSOR FOR   
    SELECT ProgramaProdSemillasA.CentroTrabajo         
  FROM ProgramaProdSemillasA        
    WHERE ProgramaProdSemillasA.Usuario = @Usuario       
 GROUP BY ProgramaProdSemillasA.CentroTrabajo  
 OPEN cRProdSemillasNukA        
 FETCH NEXT FROM cRProdSemillasNukA INTO @CtTrabajo        
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0         
   BEGIN        
  IF @@FETCH_STATUS <> -2         
    BEGIN      
       UPDATE ProgramaProdSemillasA   
       SET ProgramaProdSemillasA.PzasLibres = (ISNULL(ProgramaProdSemillasA.AProducir,0)-ISNULL(ProgramaProdSemillasA.TiempoExtra,0))        
        WHERE ProgramaProdSemillasA.CentroTrabajo = @CtTrabajo   
    AND ProgramaProdSemillasA.Usuario = @Usuario      
    END        
   FETCH NEXT FROM cRProdSemillasNukA INTO @CtTrabajo        
   END        
   CLOSE cRProdSemillasNukA        
   DEALLOCATE cRProdSemillasNukA    
   SELECT  @TVenta       = SUM(ISNULL(ProgramaProdSemillasA.Venta,0)),  
           @TAProducir   = SUM(ISNULL(ProgramaProdSemillasA.AProducir,0)),   
     @TTiempoExtra = SUM(ISNULL(ProgramaProdSemillasA.TiempoExtra,0)),         
           @TOcupacion   = SUM(ISNULL(ProgramaProdSemillasA.Ocupacion,0)),   
     @TPzasLibres  = SUM(ISNULL(ProgramaProdSemillasA.PzasLibres,0))         
     FROM ProgramaProdSemillasA         
    WHERE ProgramaProdSemillasA.Usuario = @Usuario    
   UPDATE ProgramaProdSemillasA   
   SET ProgramaProdSemillasA.TVenta       = @TVenta ,  
    ProgramaProdSemillasA.TAProducir   = @TAProducir,   
    ProgramaProdSemillasA.TTiempoExtra = @TTiempoExtra,         
    ProgramaProdSemillasA.TOcupacion   = @TOcupacion,   
    ProgramaProdSemillasA.TPzasLibres  = @TPzasLibres         
  WHERE    
    ProgramaProdSemillasA.Usuario = @Usuario     
RETURN        
END   
GO

/**************** ProgProdProcesadosNukA ****************/
if exists (select * from sysobjects where id = object_id('dbo.ProgProdProcesadosNukA') and type = 'P') DROP PROCEDURE dbo.ProgProdProcesadosNukA
GO
CREATE PROCEDURE ProgProdProcesadosNukA   
                       @Usuario  varchar(10)  
AS BEGIN  
 DECLARE   
  @CtTrabajo  VARCHAR(25),  
  @TVenta  Money,  
  @TAProducir Float,  
  @TTiempoExtra Float,  
  @TOcupacion Float,  
  @TPzasLibres Float,  
  @CapReaT  float  
  DELETE ProgramaProdProcesadosA WHERE Usuario = @Usuario  
 INSERT INTO ProgramaProdProcesadosA(Usuario, CentroTrabajo,Venta,AProducir,Familia)  
    SELECT @Usuario, 
 BalanceFC.CtTrabajo,
 SUM(ISNULL(Venta,0)),
 SUM(ISNULL(ISNULL(Art.GramajeFC,0) * ISNULL(BalanceFC.Producir,0),0)),
 BalanceFC.Familia   
   FROM BalanceFC  
   JOIN Art ON BalanceFC.Articulo = Art.Articulo
    WHERE BalanceFC.CtTrabajo IN ('PROCESADOS')  
    AND BalanceFC.Usuario = @Usuario   
   GROUP BY BalanceFC.CtTrabajo,
            BalanceFC.Familia  
  /*****bases *****/  
  SELECT @CapReaT =  CapacidadRealTotal FROM ProcesadosCF   
  UPDATE ProgramaProdProcesadosA SET  DiasHAbiles = 23,   
                                      DiasTextra = 0,   
           TiempoExtra = @CapReaT,  
           CapacidadHrs = 256  
  WHERE CentroTrabajo = 'PROCESADOS'   
    AND ProgramaProdProcesadosA.Usuario = @Usuario  
 DECLARE cRPProdProcesadosNukA CURSOR FOR  
   SELECT CtTrabajo   
    FROM ResumenPlaneacionCF    
   WHERE Usuario = @Usuario  
 OPEN cRPProdProcesadosNukA  
 FETCH NEXT FROM cRPProdProcesadosNukA INTO @CtTrabajo  
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0   
   BEGIN  
  IF @@FETCH_STATUS <> -2   
    BEGIN   
     UPDATE ProgramaProdProcesadosA SET Ocupacion =  3120975  , PzasLibres = (ISNULL(AProducir,0)-ISNULL(TiempoExtra,0))  
     WHERE ProgramaProdProcesadosA.CentroTrabajo = @CtTrabajo   
       AND ProgramaProdProcesadosA.Usuario = @Usuario  
    END  
   FETCH NEXT FROM cRPProdProcesadosNukA INTO @CtTrabajo  
   END  
   CLOSE cRPProdProcesadosNukA  
   DEALLOCATE cRPProdProcesadosNukA  
   SELECT  @TVenta =SUM(ISNULL(Venta,0)),@TAProducir = SUM(ISNULL(AProducir,0)), @TTiempoExtra = SUM(ISNULL(TiempoExtra,0)),   
    @TOcupacion = SUM(ISNULL(Ocupacion,0)), @TPzasLibres = SUM(ISNULL((PzasLibres/3),0))   
    FROM ProgramaProdProcesadosA  
    WHERE ProgramaProdProcesadosA.Usuario = @Usuario  
    UPDATE ProgramaProdProcesadosA SET TVenta     = @TVenta ,  
                                       TAProducir = @TAProducir,   
            TTiempoExtra = @TTiempoExtra,   
    TOcupacion = @TOcupacion, TPzasLibres = @TPzasLibres  
    WHERE   
    ProgramaProdProcesadosA.Usuario = @Usuario  
   --SELECT * FROM ProgramaProdProcesadosA  
RETURN  
END  
GO

/**************** spWebCoberturaMateriaPrima ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebCoberturaMateriaPrima') and type = 'P') DROP PROCEDURE dbo.spWebCoberturaMateriaPrima
GO
CREATE PROCEDURE [dbo].[spWebCoberturaMateriaPrima]                    @Usuario      varchar(10)
AS BEGIN 
DECLARE
    @ID              int, 
    @Familia         varchar(50), 
    @Empresa         char(5) = 'INCF', 
 @Inventario      float, 
 @S1              float,
 @S2              float,
 @S3              float,
 @S4              float,
 @S5              float,
 @S6              float, 
 @S7              float,
 @S8              float,
 @S9              float,
 @S10             float,
 @S11             float,
 @S12             float, 
 
    @A1              float, 
 @A2              float, 
 @A3              float, 
 @A4              float, 
 @A5              float, 
 @A6              float, 
 @A7              float, 
 @A8              float, 
 @A9              float, 
 @A10             float, 
 @A11             float, 
 @A12             float, 
 @AP1             float, 
 @AP2             float, 
 @AP3             float, 
 @AP4             float, 
 @AP5             float, 
 @AP6             float, 
 @AP7             float,
 @AP8             float, 
 @AP9             float, 
 @AP10            float, 
 @AP11            float, 
 @AP12            float, 
    @IF1             float, 
 @IF2             float, 
 @IF3             float, 
 @IF4             float, 
 @IF5             float, 
 @IF6             float, 
 @IF7             float, 
 @IF8             float, 
 @IF9             float, 
 @IF10            float, 
 @IF11            float, 
 @IF12            float, 
    @SG1             float, 
 @SG2             float, 
 @SG3             float, 
 @SG4             float, 
 @SG5             float, 
 @SG6             float, 
 @SG7             float, 
 @SG8             float, 
 @SG9             float, 
 @SG10            float, 
 @SG11            float, 
 @SG12            float, 
    @II1             float, 
 @II2             float, 
 @II3             float, 
 @II4             float, 
 @II5             float, 
 @II6             float, 
 @II7             float, 
 @II8             float, 
 @II9             float, 
 @II10            float, 
 @II11            float, 
 @II12            float,
 @TiempoEntrega   float, 
 @StockMinimo     float, 
 @StockMaximo     float, 
 @FechaEmision    datetime = dbo.fnFechaSinHora(GETDATE()), 
 @Semana          int
CREATE TABLE #Consumo (    
        ID                       int,  
  Familia                  varchar(50)  COLLATE Database_Default NULL,   
     Descripcion              varchar(100) COLLATE Database_Default NULL,
  S1                       float NULL,
  S2                       float NULL, 
  S3                       float NULL,
  S4                       float NULL, 
  S5                       float NULL, 
  S6                       float NULL,
  S7                       float NULL, 
  S8                       float NULL,
  S9                       float NULL, 
  S10                      float NULL,
  S11                      float NULL,    S12                      float NULL)     DELETE #Consumo     DECLARE crConsumo CURSOR FOR     
      SELECT        ForecastArtFam12.Familia,       dbo.fnWebArtFamDisponible (@Empresa, ForecastArtFam12.Familia),     SUM(ISNULL(ForecastArtFam12.S1,0.00)),    SUM(ISNULL(ForecastArtFam12.S2,0.00)),    SUM(ISNULL(ForecastArtFam12.S3,0.00)),    SUM(ISNULL(ForecastArtFam12.S4,0.00)),    SUM(ISNULL(ForecastArtFam12.S5,0.00)),    SUM(ISNULL(ForecastArtFam12.S6,0.00)),     SUM(ISNULL(ForecastArtFam12.S7,0.00)),    SUM(ISNULL(ForecastArtFam12.S8,0.00)),    SUM(ISNULL(ForecastArtFam12.S9,0.00)),    SUM(ISNULL(ForecastArtFam12.S10,0.00)),    SUM(ISNULL(ForecastArtFam12.S11,0.00)),    SUM(ISNULL(ForecastArtFam12.S12,0.00)),    
  SUM(ISNULL(ForecastArtFam12.A1,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A2,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A3,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A4,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A5,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A6,0.00)),
  SUM(ISNULL(ForecastArtFam12.A7,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A8,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A9,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A10,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A11,0.00)), 
  SUM(ISNULL(ForecastArtFam12.A12,0.00)),    ArtFamFC.TiempoEntrega,    ArtFamFC.StockMinimo,    ArtFamFC.StockMaximo    FROM ForecastArtFam12    JOIN  ArtFamFC ON ForecastArtFam12.Familia  = ArtFamFC.Familia    WHERE ForecastArtFam12.Usuario = @Usuario    GROUP BY         ForecastArtFam12.Familia, 
    ArtFamFC.TiempoEntrega,      ArtFamFC.StockMinimo,      ArtFamFC.StockMaximo
    OPEN crConsumo    
    FETCH NEXT FROM crConsumo INTO @Familia, @Inventario, @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12, 
                                @TiempoEntrega, @StockMinimo, @StockMaximo
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN
       INSERT INTO #Consumo (ID, Familia, Descripcion) 
      VALUES (1, @Familia, 'Inv Inicial')
     INSERT INTO #Consumo (ID, Familia, Descripcion,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12) 
     VALUES (2, @Familia, 'Forecast', @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12)
     INSERT INTO #Consumo (ID, Familia, Descripcion,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12) 
     VALUES (3, @Familia, '(+)  Mercancia enTransitos (arribos)', @A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12)
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (4, @Familia, 'Solicitud de generacion de embarque sugerido por sistema')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (5, @Familia, 'Arribos proyectados no confirmados')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (6, @Familia, '(=) Inventario final:')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (7, @Familia, 'Semanas de cobertura')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (8, @Familia, 'Lead time Semanas')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
                   VALUES (9, @Familia, NULL)
   
/** Semana 01 **/
       SELECT @II1 = @Inventario
    SELECT @IF1 = ISNULL(@II1,0.00) - ISNULL(@S1,0.00) +  ISNULL(@A1, 0.00) + ISNULL(@AP1,0.00)
       UPDATE #Consumo SET S1 = @II1  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S1 = @IF1  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S1 = ROUND(ISNULL(@IF1,0.00)  / NULLIF(@S1, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S1 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF1 < = @StockMinimo  
    BEGIN
      SELECT @SG1 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF1,0.00), @Semana =  1 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S1 = @SG1  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG1, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S1 = @AP1 WHERE ID = 5 AND Familia = @Familia 
/** Semana 01 **/
/** Semana 02 **/
       SELECT @II2 = @IF1
    SELECT @IF2 = ISNULL(@II2,0.00) - ISNULL(@S2,0.00) +  ISNULL(@A2, 0.00) + ISNULL(@AP2,0.00)
       UPDATE #Consumo SET S2 = @II2  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S2 = @IF2  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S2 = ROUND(ISNULL(@IF2,0.00)  / NULLIF(@S2, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S2 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF2 < = @StockMinimo  
    BEGIN
      SELECT @SG2 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF2,0.00), @Semana =  2 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S2 = @SG2  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG2, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S2 = @AP2 WHERE ID = 5 AND Familia = @Familia
/** Semana 02 **/
/** Semana 03 **/
       SELECT @II3 = @IF2
    SELECT @IF3 = ISNULL(@II3,0.00) - ISNULL(@S3,0.00) +  ISNULL(@A3, 0.00) + ISNULL(@AP3,0.00)
       UPDATE #Consumo SET S3 = @II3  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S3 = @IF3  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S3 = ROUND(ISNULL(@IF3,0.00)  / NULLIF(@S3, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S3 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF3 < = @StockMinimo  
    BEGIN
      SELECT @SG3 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF3,0.00), @Semana =  3 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S3 = @SG3  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG3, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S3 = @AP3 WHERE ID = 5 AND Familia = @Familia 
/** Semana 03 **/
/** Semana 04 **/
       SELECT @II4 = @IF3
    SELECT @IF4 = ISNULL(@II4,0.00) - ISNULL(@S4,0.00) +  ISNULL(@A4, 0.00) + ISNULL(@AP4,0.00)
       UPDATE #Consumo SET S4 = @II4  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S4 = @IF4  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S4 = ROUND(ISNULL(@IF4,0.00)  / NULLIF(@S4, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S4 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF4 < = @StockMinimo  
    BEGIN
      SELECT @SG4 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF4,0.00), @Semana =  4 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S4 = @SG4  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG4, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S4 = @AP4 WHERE ID = 5 AND Familia = @Familia
/** Semana 04 **/
/** Semana 05 **/
       SELECT @II5 = @IF4
    SELECT @IF5 = ISNULL(@II5,0.00) - ISNULL(@S5,0.00) +  ISNULL(@A5, 0.00) + ISNULL(@AP5,0.00)
       UPDATE #Consumo SET S5 = @II5  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S5 = @IF5  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S5 = ROUND(ISNULL(@IF5,0.00)  / NULLIF(@S5, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S5 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF5 < = @StockMinimo  
    BEGIN
      SELECT @SG5 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF5,0.00), @Semana =  5 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S5 = @SG5  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG5, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S5 = @AP5 WHERE ID = 5 AND Familia = @Familia
/** Semana 05 **/
/** Semana 06 **/
       SELECT @II6 = @IF5
    SELECT @IF6 = ISNULL(@II6,0.00) - ISNULL(@S6,0.00) +  ISNULL(@A6, 0.00) + ISNULL(@AP6,0.00)
       UPDATE #Consumo SET S6 = @II6  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S6 = @IF6  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S6 = ROUND(ISNULL(@IF6,0.00)  / NULLIF(@S6, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S6 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF6 < = @StockMinimo  
    BEGIN
      SELECT @SG6 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF6,0.00), @Semana =  6 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S6 = @SG6  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG6, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S6 = @AP6 WHERE ID = 5 AND Familia = @Familia 
/** Semana 06 **/
/** Semana 07 **/
       SELECT @II7 = @IF6
    SELECT @IF7 = ISNULL(@II7,0.00) - ISNULL(@S7,0.00) +  ISNULL(@A7, 0.00) + ISNULL(@AP7,0.00)
       UPDATE #Consumo SET S7 = @II7  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S7 = @IF7  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S7 = ROUND(ISNULL(@IF7,0.00)  / NULLIF(@S7, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S7 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF7 < = @StockMinimo  
    BEGIN
      SELECT @SG7 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF7,0.00), @Semana =  7 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S7 = @SG7  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG7, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S7 = @AP7 WHERE ID = 5 AND Familia = @Familia 
/** Semana 07 **/
/** Semana 08 **/
       SELECT @II8 = @IF7
    SELECT @IF8 = ISNULL(@II8,0.00) - ISNULL(@S8,0.00) +  ISNULL(@A8, 0.00) + ISNULL(@AP8,0.00)
       UPDATE #Consumo SET S8 = @II8  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S8 = @IF8  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S8 = ROUND(ISNULL(@IF8,0.00)  / NULLIF(@S8, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S8 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF8 < = @StockMinimo  
    BEGIN
      SELECT @SG8 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF8,0.00), @Semana =  8 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S8 = @SG8  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG8, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S8 = @AP8 WHERE ID = 5 AND Familia = @Familia 
/** Semana 08 **/
/** Semana 09 **/
       SELECT @II9 = @IF8
    SELECT @IF9 = ISNULL(@II9,0.00) - ISNULL(@S9,0.00) +  ISNULL(@A9, 0.00) + ISNULL(@AP9,0.00)
       UPDATE #Consumo SET S9 = @II9  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S9 = @IF9  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S9 = ROUND(ISNULL(@IF9,0.00)  / NULLIF(@S9, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S9 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF9 < = @StockMinimo  
    BEGIN
      SELECT @SG9 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF9,0.00), @Semana =  9 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S9 = @SG9  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG9, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S9 = @AP9 WHERE ID = 5 AND Familia = @Familia 
/** Semana 09 **/
/** Semana 10 **/
       SELECT @II10 = @IF9
    SELECT @IF10 = ISNULL(@II10,0.00) - ISNULL(@S10,0.00) +  ISNULL(@A10, 0.00) + ISNULL(@AP10,0.00)
       UPDATE #Consumo SET S10 = @II10  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S10 = @IF10  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S10 = ROUND(ISNULL(@IF10,0.00)  / NULLIF(@S10, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S10 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF10 < = @StockMinimo  
    BEGIN
      SELECT @SG10 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF10,0.00), @Semana =  10 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S10 = @SG10  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG10, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S10 = @AP10 WHERE ID = 5 AND Familia = @Familia 
/** Semana 10 **/
/** Semana 11 **/
       SELECT @II11 = @IF10
    SELECT @IF11 = ISNULL(@II11,0.00) - ISNULL(@S11,0.00) +  ISNULL(@A11, 0.00) + ISNULL(@AP11,0.00)
       UPDATE #Consumo SET S11 = @II11  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S11 = @IF11  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S11 = ROUND(ISNULL(@IF11,0.00)  / NULLIF(@S11, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S11 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF11 < = @StockMinimo  
    BEGIN
      SELECT @SG11 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF11,0.00), @Semana =  11 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S11 = @SG11  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG11, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S11 = @AP11 WHERE ID = 5 AND Familia = @Familia
/** Semana 11 **/
/** Semana 12 **/
       SELECT @II12 = @IF11
    SELECT @IF12 = ISNULL(@II12,0.00) - ISNULL(@S12,0.00) +  ISNULL(@A12, 0.00) + ISNULL(@AP12,0.00)
       UPDATE #Consumo SET S12 = @II12  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S12 = @IF12  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S12 = ROUND(ISNULL(@IF12,0.00)  / NULLIF(@S12, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S12 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF12 < = @StockMinimo  
    BEGIN
      SELECT @SG12 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF12,0.00), @Semana =  12 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S12 = @SG12  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG12, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S12 = @AP12 WHERE ID = 5 AND Familia = @Familia 
/** Semana 12 **/
      END    
      FETCH NEXT FROM crConsumo INTO @Familia, @Inventario, @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12, 
                                  @TiempoEntrega, @StockMinimo, @StockMaximo
    END    
    CLOSE crConsumo    
    DEALLOCATE crConsumo 
      SELECT *FROM #Consumo ORDER BY Familia, ID       RETURN  END  
GO

/**************** spWebForecast12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecast12') and type = 'P') DROP PROCEDURE dbo.spWebForecast12
GO
CREATE PROCEDURE [dbo].[spWebForecast12]                      @Usuario      varchar(10),         @FechaEmision datetime  AS BEGIN  DECLARE      @Empresa        char(5) = 'INCF',   @Ejercicio      int,   @Semana         int,   @Articulo       varchar(20), 
 @Cantidad       float, 
 @SemanaT        char(5), 
 @SQL            nvarchar(max),    
 @Parametros     nvarchar(max), 
 @S              varchar(5), 
 @Conteo         int  = 1, 
 @Ano            int,    @Familia        varchar(100),      @Grupo          varchar(50),   @Articulo1      varchar(20),   @S1             float,   @S2             float,   @S3             float,   @S4             float,   @S5             float,   @S6             float,   @S7             float,   @S8             float,   @S9             float,   @S10            float,   @S11            float,   @S12            float,    @Articulo2      varchar(20),   @MatCantidad    float,   @SeProduce      bit,    @S21            float,   @S22            float,   @S23            float,   @S24            float,   @S25            float,   @S26            float,   @S27            float,   @S28            float,   @S29            float,   @S210           float,   @S211           float,   @S212           float,  @_S1_FI         datetime,         
    @_S1_FF         datetime, 
    @_S2_FI         datetime,         
    @_S2_FF         datetime,
    @_S3_FI         datetime,         
    @_S3_FF         datetime,
    @_S4_FI         datetime,         
    @_S4_FF         datetime, 
    @_S5_FI         datetime,         
    @_S5_FF         datetime,
    @_S6_FI         datetime,         
    @_S6_FF         datetime, 
    @_S7_FI         datetime,         
    @_S7_FF         datetime,  
    @_S8_FI         datetime,         
    @_S8_FF         datetime,  
    @_S9_FI         datetime,         
    @_S9_FF         datetime,   
    @_S10_FI        datetime,         
    @_S10_FF        datetime, 
    @_S11_FI        datetime,         
    @_S11_FF        datetime,
    @_S12_FI        datetime,         
    @_S12_FF        datetime,   @CentroDef      varchar(10)  DELETE Arribos12      WHERE Usuario = @Usuario  DELETE Arribos12S     WHERE Usuario = @Usuario  DELETE ArribosSub12S  WHERE Usuario = @Usuario       CREATE TABLE #Forecast12 (      
        Articulo   varchar(20) COLLATE Database_Default NULL,  
  Semana     float NULL)    CREATE TABLE #Arribos12S (            
  ID                       int    NOT NULL IDENTITY(1,1),    
  Familia                  varchar(100) COLLATE Database_Default NULL,      
  Articulo                 varchar(20) COLLATE Database_Default NULL,        
  Articulo1                varchar(20) COLLATE Database_Default NULL,        
  Articulo2                varchar(20) COLLATE Database_Default NULL,        
  Articulo3                varchar(20) COLLATE Database_Default NULL,        
  S1                       float NULL,         
  S2                       float NULL,         
  S3                       float NULL,         
  S4                       float NULL,         
  S5                       float NULL,         
  S6                       float NULL,         
  S7                       float NULL,         
  S8                       float NULL,         
  S9                       float NULL,         
  S10                      float NULL,         
  S11                      float NULL,    
  S12                      float NULL)        
          DELETE #Forecast12 DELETE #Arribos12S     SELECT @_S1_FI  = CalendarioFC.FechaD, @_S1_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 1         
  SELECT @_S2_FI  = CalendarioFC.FechaD, @_S2_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 2         
  SELECT @_S3_FI  = CalendarioFC.FechaD, @_S3_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 3         
  SELECT @_S4_FI  = CalendarioFC.FechaD, @_S4_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 4         
  SELECT @_S5_FI  = CalendarioFC.FechaD, @_S5_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 5         
  SELECT @_S6_FI  = CalendarioFC.FechaD, @_S6_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 6        
  SELECT @_S7_FI  = CalendarioFC.FechaD, @_S7_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 7        
  SELECT @_S8_FI  = CalendarioFC.FechaD, @_S8_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 8         
  SELECT @_S9_FI  = CalendarioFC.FechaD, @_S9_FF  = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 9         
  SELECT @_S10_FI = CalendarioFC.FechaD, @_S10_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 10         
  SELECT @_S11_FI = CalendarioFC.FechaD, @_S11_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 11        
  SELECT @_S12_FI = CalendarioFC.FechaD, @_S12_FF = CalendarioFC.FechaA  FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario AND CalendarioFC.NoSemana = 12         DECLARE crCalendario CURSOR FOR 
     SELECT CalendarioFC.Ano, 
         CalendarioFC.Semana 
       FROM CalendarioFC 
   WHERE CalendarioFC.Usuario = @Usuario
    OPEN crCalendario    
    FETCH NEXT FROM crCalendario INTO @Ejercicio,  @Semana
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN           SELECT  @SemanaT='S'+CONVERT(varchar, @Semana)    DELETE #Forecast12         
  SET  @Sql = 'INSERT INTO #Forecast12 (Articulo, Semana)     
          SELECT VacaPresupuestoVtaConD.Articulo,             dbo.fnAumentaPorcentaje('+@SemanaT+', Art.Factorstock)        FROM VacaPresupuestoVtaConD        JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaCon.ID = VacaPresupuestoVtaConD.ID        JOIN Art                   ON VacaPresupuestoVtaConD.Articulo = Art.Articulo       WHERE VacaPresupuestoVtaCon.Ejercicio =  @Ejercicio 
      AND VacaPresupuestoVtaCon.Estatus = "CONCLUIDO"'
       SET @Parametros = '@Ejercicio int'    
       EXEC sp_executesql @Sql, @Parametros, @Ejercicio = @Ejercicio    
       
      DECLARE crFC CURSOR FOR 
     SELECT #Forecast12.Articulo, 
         SUM(ISNULL(Semana,0.00)) 
       FROM #Forecast12
     JOIN Art ON #Forecast12.Articulo = Art.Articulo 
      GROUP BY #Forecast12.Articulo
    
     OPEN crFC    
     FETCH NEXT FROM crFC INTO @Articulo, @Cantidad 
     WHILE @@FETCH_STATUS <> -1    
     BEGIN    
       IF @@FETCH_STATUS <> -2     
       BEGIN  
        SELECT @S = 'S'+CONVERT(varchar,@Conteo)
           IF NOT EXISTS(SELECT *FROM Arribos12 WHERE Articulo = @Articulo AND Usuario = @Usuario) 
                       INSERT INTO Arribos12 (Usuario, Articulo) VALUES (@Usuario, @Articulo)  
       SET @SQL = 'UPDATE Arribos12 SET '+@S+' = '+CONVERT(varchar,ROUND(@Cantidad,0)) 
         +' WHERE Articulo = '+ CHAR(39)+CONVERT(varchar, @Articulo)+CHAR(39)  
         +' AND Usuario = '+ CHAR(39)+CONVERT(varchar, @Usuario )+CHAR(39) 
       EXEC (@SQL) 
       END    
       FETCH NEXT FROM crFC INTO @Articulo, @Cantidad   
     END    
     CLOSE crFC    
     DEALLOCATE crFC 
  SELECT @Conteo = @Conteo + 1 
      END    
      FETCH NEXT FROM crCalendario INTO @Ejercicio,  @Semana   
    END    
    CLOSE crCalendario    
    DEALLOCATE crCalendario
  DECLARE crArticulo CURSOR FOR             
        SELECT Art.FamArtCF,Arribos12.Articulo, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, Art.CentroDef, Art.Grupo        
         FROM Arribos12         
   JOIN Art ON Arribos12.Articulo = Art.Articulo        
     WHERE (ISNULL(S1,0.00) <> 0.00 OR ISNULL(S2,0.00)  <> 0.00 OR ISNULL(S3,0.00)  <> 0.00 OR ISNULL(S4,0.00)  <> 0.00 OR         
            ISNULL(S5,0.00) <> 0.00 OR ISNULL(S6,0.00)  <> 0.00 OR ISNULL(S7,0.00)  <> 0.00 OR ISNULL(S8,0.00)  <> 0.00 OR        
            ISNULL(S9,0.00) <> 0.00 OR ISNULL(S10,0.00) <> 0.00 OR ISNULL(S11,0.00) <> 0.00 OR ISNULL(S12,0.00) <> 0.00 )     
           AND Arribos12.Usuario = @Usuario     
    OPEN crArticulo            
    FETCH NEXT FROM crArticulo INTO @Familia, @Articulo1, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12, @CentroDef, @Grupo         
    WHILE @@FETCH_STATUS <> -1            
    BEGIN            
      IF @@FETCH_STATUS <> -2             
      BEGIN             
  DECLARE crMaterial CURSOR FOR          
  SELECT         
        DISTINCT(Material),          
        ISNULL(ArtMaterial.Cantidad,0.00),         
     Art.SeProduce,         
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S1,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S2,0.0),0),            
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S3,0.0),0),           
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S4,0.0),0),         
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S5,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S6,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S7,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S8,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S9,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S10,0.0),0),         
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S11,0.0),0),        
     ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S12,0.0),0)        
      FROM ArtMaterial                 
      JOIN Art ON Art.Articulo = ArtMaterial.Material                
      WHERE ArtMAterial.Articulo = @Articulo1  
   -- AND ISNULL(ISNULL(Centro, @CentroDef), 0) = @CentroDef  
    OPEN crMaterial            
    FETCH NEXT FROM crMaterial INTO @Articulo2, @MatCantidad, @SeProduce, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212         
    WHILE @@FETCH_STATUS <> -1            
    BEGIN            
      IF @@FETCH_STATUS <> -2             
      BEGIN            
        IF @SeProduce = 0         
     BEGIN         
        INSERT INTO #Arribos12S (Familia, Articulo, Articulo1, Articulo2, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12)          
     VALUES (@Familia, @Articulo2, @Articulo1, @Articulo2, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212)         
     END ELSE    
  
   IF NOT EXISTS(SELECT *FROM ArribosSub12S WHERE ArribosSub12S.Articulo = @Articulo2 AND ArribosSub12S.Usuario = @Usuario) 
   BEGIN 
    INSERT INTO ArribosSub12S (Usuario, Articulo, Familia )
     SELECT 
       @Usuario,  
    Art.Articulo, 
          CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN @Familia  ELSE  'INSUMO' END      
         FROM Art 
     WHERE Art.Articulo = @Articulo2
  AND Art.Grupo NOT IN ('SIN CLASIFICAR') 
  END 
       IF @Grupo NOT IN ('GRANOS Y SEMILLAS') 
       BEGIN 
         INSERT INTO #Arribos12S (Articulo3, Familia, Articulo2, Articulo1, Articulo, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12)          
           SELECT         
         DISTINCT(Material),     
          @Familia,   
          @Articulo2,         
          @Articulo1,         
          Material,         
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S21,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S22,0.0),0),            
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S23,0.0),0),           
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S24,0.0),0),         
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S25,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S26,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S27,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S28,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S29,0.0),0),        
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S210,0.0),0),         
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S211,0.0),0),      
          ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S212,0.0),0)        
           FROM ArtMaterial                 
           JOIN Art ON Art.Articulo = ArtMaterial.Material                
           WHERE ArtMAterial.Articulo = @Articulo2   
          END  
       END            
       FETCH NEXT FROM crMaterial INTO @Articulo2, @MatCantidad, @SeProduce, @S21, @S22, @S23, @S24, @S25, @S26, @S27, @S28, @S29, @S210, @S211, @S212            
     END            
     CLOSE crMaterial            
     DEALLOCATE crMaterial     
                          
      END            
      FETCH NEXT FROM crArticulo INTO @Familia, @Articulo1, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12, @CentroDef, @Grupo           
    END            
    CLOSE crArticulo            
    DEALLOCATE crArticulo   
INSERT INTO Arribos12S (Usuario, Familia, Articulo, Descripcion, S1, A1, S2, A2, S3, A3, S4, A4, S5, A5, S6, A6, S7, A7, S8, A8, S9, A9, S10, A10, S11, A11, S12, A12)         
  SELECT   
  @Usuario, 
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN SUBSTRING(#Arribos12S.Familia, 1, 50)  ELSE  'INSUMO' END Grupo,     
  #Arribos12S.Articulo,         
  SUBSTRING(Art.Descripcion1, 1, 100),         
  SUM(ISNULL(S1,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S1_FI, @_S1_FF),         
  SUM(ISNULL(S2,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S2_FI, @_S2_FF),         
  SUM(ISNULL(S3,0.00)),          
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S3_FI, @_S3_FF),         
  SUM(ISNULL(S4,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S4_FI, @_S4_FF),         
  SUM(ISNULL(S5,0.00)),          
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S5_FI, @_S5_FF),         
  SUM(ISNULL(S6,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S6_FI, @_S6_FF),         
  SUM(ISNULL(S7,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S7_FI, @_S7_FF),         
  SUM(ISNULL(S8,0.00)),        
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S8_FI, @_S8_FF),         
  SUM(ISNULL(S9,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S9_FI, @_S9_FF),         
  SUM(ISNULL(S10,0.00)),          
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S10_FI, @_S10_FF),         
  SUM(ISNULL(S11,0.00)),         
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S11_FI, @_S11_FF),         
  SUM(ISNULL(S12,0.00)),          
  dbo.fnWebArribosCompraFechas(@Empresa, #Arribos12S.Articulo, @_S12_FI, @_S12_FF)         
    FROM #Arribos12S        
      JOIN Art ON #Arribos12S.Articulo = Art.Articulo         
      JOIN Art ArtFamilia ON #Arribos12S.Articulo1 = ArtFamilia.Articulo
 WHERE 
   Art.Grupo NOT IN ('SIN CLASIFICAR') 
     GROUP BY  
     --CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN #Arribos12S.Familia  ELSE  'INSUMO' END,   
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN SUBSTRING(#Arribos12S.Familia, 1, 50)  ELSE  'INSUMO' END,   
        #Arribos12S.Articulo,         
        Art.Descripcion1  
RETURN 
END 
GO

/**************** spWebForecastArribosConcentrado12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastArribosConcentrado12') and type = 'P') DROP PROCEDURE dbo.spWebForecastArribosConcentrado12
GO
CREATE  PROCEDURE spWebForecastArribosConcentrado12                          
            @Usuario      varchar(10)  
AS BEGIN         
DECLARE   
@Empresa          char(5) = 'INCF',   
 @Ceros           bit = 0,          
 @Familia         varchar(50),      
 @ID              int,           
 @Disponible     float,                            
 @S1          float,            
 @S2          float,            
 @S3          float,            
 @S4          float,            
 @S5          float,            
 @S6          float,             
 @S7          float,            
 @S8          float,            
 @S9          float,            
 @S10         float,            
 @S11         float,            
 @S12         float,
 @A1          float,            
 @A2          float,            
 @A3          float,            
 @A4          float,            
 @A5          float,            
 @A6          float,             
 @A7          float,            
 @A8          float,            
 @A9          float,            
 @A10         float,            
 @A11         float,            
 @A12         float--,   
 --@Fecha    datetime   = dbo.fnFechaSinHora(GETDATE())  
  CREATE TABLE #ArriboDisponible (                
  ID                       int    NOT NULL IDENTITY(1,1),              
  Familia                  varchar(50)  COLLATE Database_Default NULL,                              
  Disponible               float NULL,           
  DiasInventario           float NULL,          
  S1                       float NULL,             
  A1                       float NULL,             
  IF1                      float NULL,           
  S2                       float NULL,             
  A2                       float NULL,             
  IF2                      float NULL,           
  S3                       float NULL,            
  A3                       float NULL,            
  IF3                      float NULL,           
  S4                       float NULL,            
  A4                       float NULL,            
  IF4                      float NULL,       
  S5                       float NULL,             
  A5                       float NULL,             
  IF5                      float NULL,      
  S6                       float NULL,             
  A6                       float NULL,           
  IF6                      float NULL,      
  S7                       float NULL,             
  A7                       float NULL,           
  IF7                      float NULL,     
  S8                       float NULL,             
  A8                       float NULL,             
  IF8                      float NULL,      
  S9                       float NULL,             
  A9                       float NULL,            
  IF9                      float NULL,        
  S10                      float NULL,             
  A10                      float NULL,           
  IF10                     float NULL,     
  S11                      float NULL,              
  A11                      float NULL,            
  IF11                     float NULL,     
  S12                      float NULL,          
  A12                      float NULL,           
  IF12                     float NULL)              
  DELETE #ArriboDisponible  
 INSERT INTO #ArriboDisponible (Familia, Disponible,S1,A1,S2,A2,S3,A3,S4,A4,S5,A5,S6,A6,S7,A7,S8,A8,S9,A9,S10,A10,S11,A11,S12,A12)            
SELECT       
   ForecastArtFam12.Familia,                      
   dbo.fnWebArtFamDisponible(@Empresa, ForecastArtFam12.Familia),   
   ForecastArtFam12.S1,   
   ForecastArtFam12.A1,   
   ForecastArtFam12.S2,    
   ForecastArtFam12.A2,    
   ForecastArtFam12.S3,    
   ForecastArtFam12.A3,    
   ForecastArtFam12.S4,    
   ForecastArtFam12.A4,     
   ForecastArtFam12.S5,   
   ForecastArtFam12.A5,   
   ForecastArtFam12.S6,    
   ForecastArtFam12.A6,    
   ForecastArtFam12.S7,    
   ForecastArtFam12.A7,    
   ForecastArtFam12.S8,    
   ForecastArtFam12.A8,     
   ForecastArtFam12.S9,   
   ForecastArtFam12.A9,   
   ForecastArtFam12.S10,   
   ForecastArtFam12.A10,   
   ForecastArtFam12.S11,   
   ForecastArtFam12.A11,   
   ForecastArtFam12.S12,   
   ForecastArtFam12.A12            
   FROM ForecastArtFam12 
 WHERE ForecastArtFam12.Usuario = @Usuario 
  DECLARE crDisponible CURSOR FOR               
   SELECT ID, ISNULL(Disponible,0.00), ISNULL(S1,0.00), ISNULL(S2,0.00), ISNULL(S3,0.00), ISNULL(S4,0.00), ISNULL(S5,0.00),  ISNULL(S6,0.00),           
                                       ISNULL(S7,0.00), ISNULL(S8,0.00), ISNULL(S9,0.00), ISNULL(S10,0.00),ISNULL(S11,0.00), ISNULL(S12,0.00),           
                                       ISNULL(A1,0.00), ISNULL(A2,0.00), ISNULL(A3,0.00), ISNULL(A4,0.00), ISNULL(A5,0.00),  ISNULL(A6,0.00),           
            ISNULL(A7,0.00), ISNULL(A8,0.00), ISNULL(A9,0.00), ISNULL(A10,0.00),ISNULL(A11,0.00), ISNULL(A12,0.00)           
       FROM #ArriboDisponible          
    OPEN crDisponible              
    FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12          
    WHILE @@FETCH_STATUS <> -1              
    BEGIN              
      IF @@FETCH_STATUS <> -2               
      BEGIN      
      UPDATE #ArriboDisponible SET IF1  = ISNULL(@Disponible,0.00) - ISNULL(@S1,0.00) + ISNULL(@A1,0.00) WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF2  = ISNULL(IF1,0.00)  - ISNULL(@S2,0.00)  + ISNULL(@A2,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF3  = ISNULL(IF2,0.00)  - ISNULL(@S3,0.00)  + ISNULL(@A3,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF4  = ISNULL(IF3,0.00)  - ISNULL(@S4,0.00)  + ISNULL(@A4,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF5  = ISNULL(IF4,0.00)  - ISNULL(@S5,0.00)  + ISNULL(@A5,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF6  = ISNULL(IF5,0.00)  - ISNULL(@S6,0.00)  + ISNULL(@A6,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF7  = ISNULL(IF6,0.00)  - ISNULL(@S7,0.00)  + ISNULL(@A7,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF8  = ISNULL(IF7,0.00)  - ISNULL(@S8,0.00)  + ISNULL(@A8,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF9  = ISNULL(IF8,0.00)  - ISNULL(@S9,0.00)  + ISNULL(@A9,0.00)   WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF10 = ISNULL(IF9,0.00)  - ISNULL(@S10,0.00) + ISNULL(@A10,0.00)  WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF11 = ISNULL(IF10,0.00) - ISNULL(@S11,0.00) + ISNULL(@A11,0.00)  WHERE ID = @ID           
      UPDATE #ArriboDisponible SET IF12 = ISNULL(IF11,0.00) - ISNULL(@S12,0.00) + ISNULL(@A12,0.00)  WHERE ID = @ID      
      END              
      FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12             
    END              
    CLOSE crDisponible              
    DEALLOCATE crDisponible           
  SELECT                    
  #ArriboDisponible.Familia,                        
  CASE WHEN #ArriboDisponible.Familia NOT IN ('Insumos') THEN 'MATERIA PRIMA'  ELSE  'INSUMO' END Grupo,           
  SUM(ISNULL(Disponible, 0.00)) AS Disponible,            
  ISNULL(NULLIF(ROUND((SUM(ISNULL(Disponible, 0.00))/NULLIF(SUM(ISNULL(IF1,0.00)),0.00)) * 4,0),0),0) AS DiasInventario,           
  SUM(ISNULL(S1,0.00))  AS S1,           
  SUM(ISNULL(A1,0.00))  AS A1,           
  SUM(ISNULL(IF1,0.00)) AS IF1,         
  SUM(ISNULL(S2,0.00))  AS S2,            
  SUM(ISNULL(A2,0.00))  AS A2,           
  SUM(ISNULL(IF2,0.00)) AS IF2,          
  SUM(ISNULL(S3,0.00))  AS S3,           
  SUM(ISNULL(A3,0.00))  AS A3,          
  SUM(ISNULL(IF3,0.00)) AS IF3,          
  SUM(ISNULL(S4,0.00))  AS S4,          
  SUM(ISNULL(A4,0.00))  AS A4,        
  SUM(ISNULL(IF4,0.00)) AS IF4,       
  SUM(ISNULL(S5,0.00))  AS S5,            
  SUM(ISNULL(A5,0.00))  AS A5,          
  SUM(ISNULL(IF5,0.00)) AS IF5,          
  SUM(ISNULL(S6,0.00))  AS S6,           
  SUM(ISNULL(A6,0.00))  AS A6,         
  SUM(ISNULL(IF6,0.00)) AS IF6,         
  SUM(ISNULL(S7,0.00))  AS S7,           
  SUM(ISNULL(A7,0.00))  AS A7,           
  SUM(ISNULL(IF7,0.00)) AS IF7,        
  SUM(ISNULL(S8,0.00))  AS S8,           
  SUM(ISNULL(A8,0.00))  AS A8,           
  SUM(ISNULL(IF8,0.00)) AS IF8,          
  SUM(ISNULL(S9,0.00))  AS S9,          
  SUM(ISNULL(A9,0.00))  AS A9,          
  SUM(ISNULL(IF9,0.00)) AS IF9,          
  SUM(ISNULL(S10,0.00))  AS S10,          
  SUM(ISNULL(A10,0.00))  AS A10,        
  SUM(ISNULL(IF10,0.00)) AS IF10,           
  SUM(ISNULL(S11,0.00))  AS S11,       
  SUM(ISNULL(A11,0.00))  AS A11,          
  SUM(ISNULL(IF11,0.00)) AS IF11,          
  SUM(ISNULL(S12,0.00))  AS S12,            
  SUM(ISNULL(A12,0.00))  AS A12,        
  SUM(ISNULL(IF12,0.00)) AS IF12     
  FROM #ArriboDisponible        
  GROUP BY   
    #ArriboDisponible.Familia,                        
  CASE WHEN #ArriboDisponible.Familia NOT IN ('Insumos') THEN 'MATERIA PRIMA'  ELSE  'INSUMO' END     
  ORDER BY Grupo DESC , Familia ASC    
RETURN             
END  
GO

/**************** spWebForecastArribosInsumo12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastArribosInsumo12') and type = 'P') DROP PROCEDURE dbo.spWebForecastArribosInsumo12
GO
CREATE PROCEDURE spWebForecastArribosInsumo12                         
            @Usuario      varchar(10)        
AS BEGIN     
DECLARE        
 @Ceros           bit = 0,      
 @Familia         varchar(50),  
 @ID              int,       
 @Disponible     float,                        
 @S1          float,        
 @S2          float,        
 @S3          float,        
 @S4          float,        
 @S5          float,        
 @S6          float,         
 @S7          float,        
 @S8          float,        
 @S9          float,        
 @S10         float,        
 @S11         float,        
 @S12         float,        
 @A1          float,        
 @A2          float,        
 @A3          float,        
 @A4          float,        
 @A5          float,        
 @A6          float,         
 @A7          float,        
 @A8          float,        
 @A9          float,        
 @A10         float,        
 @A11         float,        
 @A12         float       
  CREATE TABLE #ArriboDisponible (            
  ID                       int    NOT NULL IDENTITY(1,1),          
  Familia                  varchar(20)  COLLATE Database_Default NULL,        
  Articulo                 varchar(20)  COLLATE Database_Default NULL,        
  Descripcion              varchar(100) COLLATE Database_Default NULL,        
  Disponible               float NULL,       
  DiasInventario           float NULL,      
  S1                       float NULL,         
  A1                       float NULL,         
  IF1                      float NULL,       
  S2                       float NULL,         
  A2                       float NULL,         
  IF2                      float NULL,       
  S3                       float NULL,        
  A3                       float NULL,        
  IF3                      float NULL,       
  S4                       float NULL,        
  A4                       float NULL,        
  IF4                      float NULL,   
  S5                       float NULL,         
  A5                       float NULL,         
  IF5                      float NULL,  
  S6                       float NULL,         
  A6                       float NULL,       
  IF6                      float NULL,  
  S7                       float NULL,         
  A7                       float NULL,       
  IF7                      float NULL, 
  S8                       float NULL,         
  A8                       float NULL,         
  IF8                      float NULL,  
  S9                       float NULL,         
  A9                       float NULL,        
  IF9                      float NULL,    
  S10                      float NULL,         
  A10                      float NULL,       
  IF10                     float NULL, 
  S11                      float NULL,          
  A11                      float NULL,        
  IF11                     float NULL, 
  S12                      float NULL,      
  A12                      float NULL,       
  IF12                     float NULL)     
 DELETE #ArriboDisponible
 INSERT INTO #ArriboDisponible (Familia, Articulo, Descripcion, Disponible,S1,A1,S2,A2,S3,A3,S4,A4,S5,A5,S6,A6,S7,A7,S8,A8,S9,A9,S10,A10,S11,A11,S12,A12)        
SELECT   
  Arribos12S.Familia,     
  Arribos12S.Articulo,         
  Arribos12S.Descripcion,        
  ROUND(SUM(ISNULL(ARTDISPONIBLEVACA.Disponible,0.00)),0)  AS Disponible,          
  Arribos12S.S1, Arribos12S.A1, Arribos12S.S2,  Arribos12S.A2,  Arribos12S.S3,  Arribos12S.A3,  Arribos12S.S4,  Arribos12S.A4, 
  Arribos12S.S5, Arribos12S.A5, Arribos12S.S6,  Arribos12S.A6,  Arribos12S.S7,  Arribos12S.A7,  Arribos12S.S8,  Arribos12S.A8, 
  Arribos12S.S9, Arribos12S.A9, Arribos12S.S10, Arribos12S.A10, Arribos12S.S11, Arribos12S.A11, Arribos12S.S12, Arribos12S.A12        
   FROM Arribos12S        
   LEFT OUTER JOIN  ARTDISPONIBLEVACA ON Arribos12S.Articulo = ARTDISPONIBLEVACA.Articulo         
                                     AND ARTDISPONIBLEVACA.Empresa = 'INCF'         
          AND ARTDISPONIBLEVACA.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1) 
WHERE Arribos12S.Usuario = @Usuario 
  AND Arribos12S.Familia = 'INSUMO'
 GROUP BY     
  Arribos12S.Familia, Arribos12S.Articulo, Arribos12S.Descripcion,          
  Arribos12S.S1, Arribos12S.A1, Arribos12S.S2,  Arribos12S.A2,  Arribos12S.S3,  Arribos12S.A3,  Arribos12S.S4,  Arribos12S.A4, 
  Arribos12S.S5, Arribos12S.A5, Arribos12S.S6,  Arribos12S.A6,  Arribos12S.S7,  Arribos12S.A7,  Arribos12S.S8,  Arribos12S.A8, 
  Arribos12S.S9, Arribos12S.A9, Arribos12S.S10, Arribos12S.A10, Arribos12S.S11, Arribos12S.A11, Arribos12S.S12, Arribos12S.A12          
  DECLARE crDisponible CURSOR FOR           
   SELECT ID, ISNULL(Disponible,0.00), ISNULL(S1,0.00), ISNULL(S2,0.00), ISNULL(S3,0.00), ISNULL(S4,0.00), ISNULL(S5,0.00),  ISNULL(S6,0.00),       
                                       ISNULL(S7,0.00), ISNULL(S8,0.00), ISNULL(S9,0.00), ISNULL(S10,0.00),ISNULL(S11,0.00), ISNULL(S12,0.00),       
                                       ISNULL(A1,0.00), ISNULL(A2,0.00), ISNULL(A3,0.00), ISNULL(A4,0.00), ISNULL(A5,0.00),  ISNULL(A6,0.00),       
            ISNULL(A7,0.00), ISNULL(A8,0.00), ISNULL(A9,0.00), ISNULL(A10,0.00),ISNULL(A11,0.00), ISNULL(A12,0.00)       
       FROM #ArriboDisponible      
    OPEN crDisponible          
    FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12      
    WHILE @@FETCH_STATUS <> -1          
    BEGIN          
      IF @@FETCH_STATUS <> -2           
      BEGIN  
      UPDATE #ArriboDisponible SET IF1  = ISNULL(@Disponible,0.00) - ISNULL(@S1,0.00) + ISNULL(@A1,0.00) WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF2  = ISNULL(IF1,0.00)  - ISNULL(@S2,0.00)  + ISNULL(@A2,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF3  = ISNULL(IF2,0.00)  - ISNULL(@S3,0.00)  + ISNULL(@A3,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF4  = ISNULL(IF3,0.00)  - ISNULL(@S4,0.00)  + ISNULL(@A4,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF5  = ISNULL(IF4,0.00)  - ISNULL(@S5,0.00)  + ISNULL(@A5,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF6  = ISNULL(IF5,0.00)  - ISNULL(@S6,0.00)  + ISNULL(@A6,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF7  = ISNULL(IF6,0.00)  - ISNULL(@S7,0.00)  + ISNULL(@A7,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF8  = ISNULL(IF7,0.00)  - ISNULL(@S8,0.00)  + ISNULL(@A8,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF9  = ISNULL(IF8,0.00)  - ISNULL(@S9,0.00)  + ISNULL(@A9,0.00)   WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF10 = ISNULL(IF9,0.00)  - ISNULL(@S10,0.00) + ISNULL(@A10,0.00)  WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF11 = ISNULL(IF10,0.00) - ISNULL(@S11,0.00) + ISNULL(@A11,0.00)  WHERE ID = @ID       
      UPDATE #ArriboDisponible SET IF12 = ISNULL(IF11,0.00) - ISNULL(@S12,0.00) + ISNULL(@A12,0.00)  WHERE ID = @ID  
      END          
      FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12         
    END          
    CLOSE crDisponible          
    DEALLOCATE crDisponible       
    SELECT       
  ID,          
  #ArriboDisponible.Familia,        
  #ArriboDisponible.Articulo,        
  Descripcion,      
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN 'MATERIA PRIMA'  ELSE  'INSUMO' END Grupo,       
  Disponible,       
  ISNULL(NULLIF(ROUND((ISNULL(Disponible,0.00)/NULLIF(IF1,0.00)) * 4,0),0),0) AS DiasInventario,       
  S1 ,        
  A1 ,        
  IF1,      
  S2 ,        
  A2 ,        
  IF2,      
  S3 ,       
  A3 ,       
  IF3,      
  S4 ,       
  A4 ,       
  IF4,      
  S5 ,        
  A5 ,        
  IF5,      
  S6 ,        
  A6 ,      
  IF6,      
  S7 ,        
  A7 ,      
  IF7,      
  S8 ,        
  A8 ,        
  IF8,      
  S9 ,        
  A9 ,       
  IF9,      
  S10,        
  A10,      
  IF10,       
  S11,         
  A11,       
  IF11,       
  S12,      
 A12,      
  IF12       
  FROM #ArriboDisponible      
  JOIN Art ON #ArriboDisponible.Articulo = Art.Articulo    
  ORDER BY Grupo DESC , Familia ASC  
RETURN         
END      
GO

/**************** spWebForecastArribosMateriaPrima12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastArribosMateriaPrima12') and type = 'P') DROP PROCEDURE dbo.spWebForecastArribosMateriaPrima12
GO
CREATE PROCEDURE [dbo].[spWebForecastArribosMateriaPrima12]                        
            @Usuario      varchar(10)          
AS BEGIN       
DECLARE          
 @Ceros           bit = 0,        
 @Familia         varchar(50),    
 @ID              int,         
 @Disponible     float,                          
 @S1          float,          
 @S2          float,          
 @S3          float,          
 @S4          float,          
 @S5          float,          
 @S6          float,           
 @S7          float,          
 @S8          float,          
 @S9          float,          
 @S10         float,          
 @S11         float,          
 @S12         float,          
 @A1          float,          
 @A2          float,          
 @A3          float,          
 @A4          float,          
 @A5          float,          
 @A6          float,           
 @A7          float,          
 @A8          float,          
 @A9          float,          
 @A10         float,          
 @A11         float,          
 @A12         float         
  CREATE TABLE #ArriboDisponible (              
  ID                       int    NOT NULL IDENTITY(1,1),            
  Familia                  varchar(50)  COLLATE Database_Default NULL,          
  Articulo                 varchar(50)  COLLATE Database_Default NULL,          
  Descripcion              varchar(100) COLLATE Database_Default NULL,          
  Disponible               float NULL,         
  DiasInventario           float NULL,        
  S1                       float NULL,           
  A1                       float NULL,           
  IF1                      float NULL,         
  S2                       float NULL,           
  A2                       float NULL,           
  IF2                      float NULL,         
  S3                       float NULL,          
  A3                       float NULL,          
  IF3                      float NULL,         
  S4                       float NULL,          
  A4                       float NULL,          
  IF4                      float NULL,     
  S5                       float NULL,           
  A5                       float NULL,           
  IF5                      float NULL,    
  S6                       float NULL,           
  A6                       float NULL,         
  IF6                      float NULL,    
  S7                       float NULL,           
  A7                       float NULL,         
  IF7                      float NULL,   
  S8                       float NULL,           
  A8                       float NULL,           
  IF8                      float NULL,    
  S9                       float NULL,           
  A9                       float NULL,          
  IF9                      float NULL,      
  S10                      float NULL,           
  A10                      float NULL,         
  IF10                     float NULL,   
  S11                      float NULL,            
  A11                      float NULL,          
  IF11                     float NULL,   
  S12                      float NULL,        
  A12                      float NULL,         
  IF12                     float NULL)       
 DELETE #ArriboDisponible  
 INSERT INTO #ArriboDisponible (Familia, Articulo, Descripcion, Disponible,S1,A1,S2,A2,S3,A3,S4,A4,S5,A5,S6,A6,S7,A7,S8,A8,S9,A9,S10,A10,S11,A11,S12,A12)          
SELECT     
  Arribos12S.Familia,       
  Arribos12S.Articulo,           
  Arribos12S.Descripcion,          
  ROUND(SUM(ISNULL(ArtDisponible.Disponible,0.00)),0)  AS Disponible,            
  Arribos12S.S1, Arribos12S.A1, Arribos12S.S2,  Arribos12S.A2,  Arribos12S.S3,  Arribos12S.A3,  Arribos12S.S4,  Arribos12S.A4,   
  Arribos12S.S5, Arribos12S.A5, Arribos12S.S6,  Arribos12S.A6,  Arribos12S.S7,  Arribos12S.A7,  Arribos12S.S8,  Arribos12S.A8,   
  Arribos12S.S9, Arribos12S.A9, Arribos12S.S10, Arribos12S.A10, Arribos12S.S11, Arribos12S.A11, Arribos12S.S12, Arribos12S.A12          
   FROM Arribos12S          
   LEFT OUTER JOIN  ArtDisponible ON Arribos12S.Articulo = ArtDisponible.Articulo           
                                     AND ArtDisponible.Empresa = 'INCF'           
          AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)   
WHERE Arribos12S.Usuario = @Usuario   
  AND Arribos12S.Familia NOT IN ('INSUMO')  
 GROUP BY       
  Arribos12S.Familia, Arribos12S.Articulo, Arribos12S.Descripcion,            
  Arribos12S.S1, Arribos12S.A1, Arribos12S.S2,  Arribos12S.A2,  Arribos12S.S3,  Arribos12S.A3,  Arribos12S.S4,  Arribos12S.A4,   
  Arribos12S.S5, Arribos12S.A5, Arribos12S.S6,  Arribos12S.A6,  Arribos12S.S7,  Arribos12S.A7,  Arribos12S.S8,  Arribos12S.A8,   
  Arribos12S.S9, Arribos12S.A9, Arribos12S.S10, Arribos12S.A10, Arribos12S.S11, Arribos12S.A11, Arribos12S.S12, Arribos12S.A12            
  DECLARE crDisponible CURSOR FOR             
   SELECT ID, ISNULL(Disponible,0.00), ISNULL(S1,0.00), ISNULL(S2,0.00), ISNULL(S3,0.00), ISNULL(S4,0.00), ISNULL(S5,0.00),  ISNULL(S6,0.00),         
                                       ISNULL(S7,0.00), ISNULL(S8,0.00), ISNULL(S9,0.00), ISNULL(S10,0.00),ISNULL(S11,0.00), ISNULL(S12,0.00),         
                                       ISNULL(A1,0.00), ISNULL(A2,0.00), ISNULL(A3,0.00), ISNULL(A4,0.00), ISNULL(A5,0.00),  ISNULL(A6,0.00),         
            ISNULL(A7,0.00), ISNULL(A8,0.00), ISNULL(A9,0.00), ISNULL(A10,0.00),ISNULL(A11,0.00), ISNULL(A12,0.00)         
       FROM #ArriboDisponible        
    OPEN crDisponible            
    FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12        
    WHILE @@FETCH_STATUS <> -1            
    BEGIN            
      IF @@FETCH_STATUS <> -2             
      BEGIN    
      UPDATE #ArriboDisponible SET IF1  = ISNULL(@Disponible,0.00) - ISNULL(@S1,0.00) + ISNULL(@A1,0.00) WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF2  = ISNULL(IF1,0.00)  - ISNULL(@S2,0.00)  + ISNULL(@A2,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF3  = ISNULL(IF2,0.00)  - ISNULL(@S3,0.00)  + ISNULL(@A3,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF4  = ISNULL(IF3,0.00)  - ISNULL(@S4,0.00)  + ISNULL(@A4,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF5  = ISNULL(IF4,0.00)  - ISNULL(@S5,0.00)  + ISNULL(@A5,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF6  = ISNULL(IF5,0.00)  - ISNULL(@S6,0.00)  + ISNULL(@A6,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF7  = ISNULL(IF6,0.00)  - ISNULL(@S7,0.00)  + ISNULL(@A7,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF8  = ISNULL(IF7,0.00)  - ISNULL(@S8,0.00)  + ISNULL(@A8,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF9  = ISNULL(IF8,0.00)  - ISNULL(@S9,0.00)  + ISNULL(@A9,0.00)   WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF10 = ISNULL(IF9,0.00)  - ISNULL(@S10,0.00) + ISNULL(@A10,0.00)  WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF11 = ISNULL(IF10,0.00) - ISNULL(@S11,0.00) + ISNULL(@A11,0.00)  WHERE ID = @ID         
      UPDATE #ArriboDisponible SET IF12 = ISNULL(IF11,0.00) - ISNULL(@S12,0.00) + ISNULL(@A12,0.00)  WHERE ID = @ID    
      END            
      FETCH NEXT FROM crDisponible INTO @ID,@Disponible,@S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12           
    END            
    CLOSE crDisponible            
    DEALLOCATE crDisponible         
    SELECT         
  ID,            
  #ArriboDisponible.Familia,          
  #ArriboDisponible.Articulo,          
  Descripcion,        
  CASE WHEN Art.Grupo NOT IN ('INSUMOS DE PRODUCCION') THEN 'MATERIA PRIMA'  ELSE  'INSUMO' END Grupo,         
  Disponible,       
  ISNULL(NULLIF(ROUND((ISNULL(Disponible,0.00)/NULLIF(IF1,0.00)) * 4,0),0),0) AS DiasInventario,         
  S1 ,          
  A1 ,          
  IF1,        
  S2 ,          
  A2 ,          
  IF2,        
  S3 ,         
  A3 ,         
  IF3,        
  S4 ,         
  A4 ,         
  IF4,        
  S5 ,          
  A5 ,          
  IF5,        
  S6 ,          
  A6 ,        
  IF6,        
  S7 ,          
  A7 ,        
  IF7,        
  S8 ,          
  A8 ,          
  IF8,        
  S9 ,          
  A9 ,         
  IF9,        
  S10,          
  A10,        
  IF10,         
  S11,           
  A11,         
  IF11,         
  S12,        
 A12,        
  IF12         
  FROM #ArriboDisponible        
  JOIN Art ON #ArriboDisponible.Articulo = Art.Articulo      
  ORDER BY Grupo DESC , Familia ASC    
RETURN           
END  
GO

/**************** spWebFCFaltanteConcentrado ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebFCFaltanteConcentrado') and type = 'P') DROP PROCEDURE dbo.spWebFCFaltanteConcentrado
GO
CREATE PROCEDURE spWebFCFaltanteConcentrado     
                     @Usuario      varchar(10),       
                     @Ejercicio    int,       
                     @Periodo      int       
AS BEGIN         
  CREATE TABLE #Existencia (   
  Familia                      varchar(50)  COLLATE Database_Default NULL,     
  Articulo                     varchar(20)  COLLATE Database_Default NULL,         
  DisponibilidadICF            float NULL,   
  InvRequerido                 float NULL,   
  Faltante                     float NULL,   
  INVENTARIOALMACENADOAVC      float NULL,        
  INVENTARIOALMACENADOPBC      float NULL,         
  EXISTENCIASAVC               float NULL,         
  ARRIBOSAVC                   float NULL,         
  EXISTENCIASPBC               float NULL)   
  INSERT INTO #Existencia(Familia, Articulo, InvRequerido)       
   SELECT ExplocionMatCF.FamiliaCF, ExplocionMatCF.ArticuloHijo, SUM(ISNULL(InvRequerido,0.00))  
    FROM          
    ExplocionMatCF     
    JOIN Art ON ExplocionMatCF.ArticuloHijo = Art.Articulo   
   WHERE  ExplocionMatCF.ArticuloHijo IS NOT NULL     
   AND ExplocionMatCF.Usuario = @Usuario   
   AND Art.SeProduce = 0 
   AND Art.Grupo NOT IN ('INSUMOS DE PRODUCCION', 'SIN CLASIFICAR')     
   GROUP BY ExplocionMatCF.ArticuloHijo,   
            ExplocionMatCF.FamiliaCF   
    UPDATE #Existencia SET #Existencia.DisponibilidadICF = dbo.fnWebArtMaterialDisponible ('INCF', Articulo)     
   UPDATE #Existencia SET Faltante =   - (ISNULL(DISPONIBILIDADICF,0.00) - ISNULL(InvRequerido,0.00))  
   SELECT        
    #Existencia.Familia                                                               AS Familia ,            
    CONVERT(decimal(18,0),SUM(ISNULL(InvRequerido,0.00)))                             AS InventarioRequerido,        
    CONVERT(decimal(18,0),SUM(ISNULL(CONVERT(float,DISPONIBILIDADICF),0.00)))         AS DisponibilidadICF,         
    CONVERT(decimal(18,0),dbo.fnMayor(SUM(ISNULL(Faltante,0.00)),0))                  AS Faltante       
    FROM #Existencia            
     LEFT OUTER JOIN  Art         ON #Existencia.Articulo = Art.Articulo         
 GROUP BY #Existencia.Familia      
    HAVING SUM(ISNULL(Faltante,0.00)) > 0.00    
 ORDER BY #Existencia.Familia ASC   
  RETURN         
  END  
GO

/**************** spFCForcastCFNuk ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCForcastCFNuk') and type = 'P') DROP PROCEDURE dbo.spFCForcastCFNuk
GO
CREATE PROCEDURE spFCForcastCFNuk   
  @Usuario      varchar(10) NULL,   
  @Ejercicio    int = NULL,   
  @Periodo      int = NULL,   
  @EnSilencio   bit = NULL   
AS BEGIN    
 DECLARE    
 @Empresa  char(5) = 'INCF',   
 @Articulo  Varchar(20),    
 @Disponible  float,     
 @Factor   float,    
 @Granel   float,    
 @ArtG   Varchar(20),    
 @CantS   float,    
 @Res   float,    
 @P    float   
 IF @EnSilencio IS NULL SELECT @EnSilencio = 0  
 DELETE ResumenPlaneacionCF  
 WHERE  ResumenPlaneacionCF.Usuario = @Usuario  
 INSERT INTO ResumenPlaneacionCF  (Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo,   Descripcion, Cliente, NombreCte,     
           Programa, S1,S2,S3,S4,S5,S6,S7,    
           S8,S9,S10,S11,S12,S13,S14,S15,    
           S16,S17,S18,S19,S20,S21,S22,S23,    
           S24,S25,S26,S27,S28,S29,S30,S31,    
           S32,S33,S34,S35,S36,S37,S38,S39,    
           S40,S41,S42,S43,S44,S45,S46,S47,    
           S48,S49,S50,S51,S52,S53,S54,Venta,Stock,InvEmp,InvGra,TotalInv,Producir,Gramaje,Kg,Familia,FamiliaCF,VariedadCF, Factorstock)       
 SELECT @Usuario,   
        ROW_NUMBER() OVER (ORDER BY VacaPresupuestoVtaConD.Prioridad),   
        dbo.fnFCCentroTrabajo (@Usuario, VacaPresupuestoVtaConD.Articulo,  
                                   VacaPresupuestoVtaConD.Concepto,   
           VacaPresupuestoVtaConD.Cliente,  
           VacaPresupuestoVtaConD.Programa),   
  VacaPresupuestoVtaConD.Ejercicio,  
  VacaPresupuestoVtaConD.Concepto,  
  VacaPresupuestoVtaConD.Articulo,  
  Art.Descripcion1,  
  VacaPresupuestoVtaConD.Cliente,  
  Cte.Nombre,   
  VacaPresupuestoVtaConD.Programa,  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 1, VacaPresupuestoVtaConD.S1),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 2, VacaPresupuestoVtaConD.S2),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 3, VacaPresupuestoVtaConD.S3),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 4, VacaPresupuestoVtaConD.S4),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 5, VacaPresupuestoVtaConD.S5),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 6, VacaPresupuestoVtaConD.S6),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 7, VacaPresupuestoVtaConD.S7),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 8, VacaPresupuestoVtaConD.S8),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 9, VacaPresupuestoVtaConD.S9),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 10, VacaPresupuestoVtaConD.S10),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 11, VacaPresupuestoVtaConD.S11),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 12, VacaPresupuestoVtaConD.S12),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 13, VacaPresupuestoVtaConD.S13),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 14, VacaPresupuestoVtaConD.S14),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 15, VacaPresupuestoVtaConD.S15),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 16, VacaPresupuestoVtaConD.S16),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 17, VacaPresupuestoVtaConD.S17),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 18, VacaPresupuestoVtaConD.S18),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 19, VacaPresupuestoVtaConD.S19),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 20, VacaPresupuestoVtaConD.S20),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 21, VacaPresupuestoVtaConD.S21),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 22, VacaPresupuestoVtaConD.S22),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 23, VacaPresupuestoVtaConD.S23),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 24, VacaPresupuestoVtaConD.S24),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 25, VacaPresupuestoVtaConD.S25),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 26, VacaPresupuestoVtaConD.S26),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 27, VacaPresupuestoVtaConD.S27),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 28, VacaPresupuestoVtaConD.S28),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 29, VacaPresupuestoVtaConD.S29),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 30, VacaPresupuestoVtaConD.S30),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 31, VacaPresupuestoVtaConD.S31),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 32, VacaPresupuestoVtaConD.S32),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 33, VacaPresupuestoVtaConD.S33),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 34, VacaPresupuestoVtaConD.S34),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 35, VacaPresupuestoVtaConD.S35),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 36, VacaPresupuestoVtaConD.S36),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 37, VacaPresupuestoVtaConD.S37),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 38, VacaPresupuestoVtaConD.S38),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 39, VacaPresupuestoVtaConD.S39),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 40, VacaPresupuestoVtaConD.S40),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 41, VacaPresupuestoVtaConD.S41),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 42, VacaPresupuestoVtaConD.S42),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 43, VacaPresupuestoVtaConD.S43),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 44, VacaPresupuestoVtaConD.S44),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 45, VacaPresupuestoVtaConD.S45),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 46, VacaPresupuestoVtaConD.S46),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 47, VacaPresupuestoVtaConD.S47),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 48, VacaPresupuestoVtaConD.S48),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 49, VacaPresupuestoVtaConD.S49),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 50, VacaPresupuestoVtaConD.S50),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 51, VacaPresupuestoVtaConD.S51),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 52, VacaPresupuestoVtaConD.S52),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 53, VacaPresupuestoVtaConD.S53),  
  dbo.fnFCPresupuestoSemana(@Ejercicio, @Periodo, 54, VacaPresupuestoVtaConD.S54),    
  0,  
  0,  
  0,  
  0,  
  0,  
  0,  
  ISNULL(Art.GramajeFC,0),    
  0,    
  NULL,  
  ISNULL(FamArtCF,'vacio'),  
  ISNULL(VarArtCF,'vacio'),   
  Art.Factorstock  
 FROM   
   VacaPresupuestoVtaConD    
  LEFT OUTER JOIN Art ON VacaPresupuestoVtaConD.Articulo=Art.Articulo    
  LEFT OUTER JOIN Cte ON VacaPresupuestoVtaConD.Cliente=Cte.Cliente  
  LEFT OUTER JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaConD.ID = VacaPresupuestoVtaCon.ID  
 WHERE        
      VacaPresupuestoVtaConD.Ejercicio = @Ejercicio  
  AND VacaPresupuestoVtaCon.Estatus   =  'CONCLUIDO'
 ORDER BY 
      VacaPresupuestoVtaConD.Prioridad, 
   VacaPresupuestoVtaConD.Ejercicio, VacaPresupuestoVtaConD.Concepto    
  DELETE  ResumenPlaneacionCF WHERE (ISNULL(S1,0.00)  + ISNULL(S2,0.00)  + ISNULL(S3,0.00)  + ISNULL(S4,0.00)  + ISNULL(S5,0.00) +  
          ISNULL(S6,0.00)  + ISNULL(S7,0.00)  + ISNULL(S8,0.00)  + ISNULL(S9,0.00)  + ISNULL(S10,0.00) +  
          ISNULL(S11,0.00) + ISNULL(S12,0.00) + ISNULL(S13,0.00) + ISNULL(S14,0.00) + ISNULL(S15,0.00) +  
          ISNULL(S16,0.00) + ISNULL(S17,0.00) + ISNULL(S18,0.00) + ISNULL(S19,0.00) + ISNULL(S20,0.00) +  
          ISNULL(S21,0.00) + ISNULL(S22,0.00) + ISNULL(S23,0.00) + ISNULL(S24,0.00) + ISNULL(S25,0.00) +   
          ISNULL(S26,0.00) + ISNULL(S27,0.00) + ISNULL(S28,0.00) + ISNULL(S29,0.00) + ISNULL(S30,0.00) +   
          ISNULL(S31,0.00) + ISNULL(S32,0.00) + ISNULL(S33,0.00) + ISNULL(S34,0.00) + ISNULL(S35,0.00) +   
          ISNULL(S36,0.00) + ISNULL(S37,0.00) + ISNULL(S38,0.00) + ISNULL(S39,0.00) + ISNULL(S40,0.00) +   
          ISNULL(S41,0.00) + ISNULL(S42,0.00) + ISNULL(S43,0.00) + ISNULL(S44,0.00) + ISNULL(S45,0.00) +   
          ISNULL(S46,0.00) + ISNULL(S47,0.00) + ISNULL(S48,0.00) + ISNULL(S49,0.00) + ISNULL(S50,0.00) +   
          ISNULL(S51,0.00) + ISNULL(S52,0.00) + ISNULL(S53,0.00) + ISNULL(S54,0.00)) = 0   
    AND   
    ResumenPlaneacionCF.Usuario = @Usuario  
 EXEC  spFCForcastCFAgrupar @Usuario    
--revisar lo de los programas por que ser repite A3746    
 UPDATE ResumenPlaneacionCF SET Venta = ISNULL(S1,0.00)  + ISNULL(S2,0.00)  + ISNULL(S3,0.00)  + ISNULL(S4,0.00)  + ISNULL(S5,0.00) +  
          ISNULL(S6,0.00)  + ISNULL(S7,0.00)  + ISNULL(S8,0.00)  + ISNULL(S9,0.00)  + ISNULL(S10,0.00) +  
          ISNULL(S11,0.00) + ISNULL(S12,0.00) + ISNULL(S13,0.00) + ISNULL(S14,0.00) + ISNULL(S15,0.00) +  
          ISNULL(S16,0.00) + ISNULL(S17,0.00) + ISNULL(S18,0.00) + ISNULL(S19,0.00) + ISNULL(S20,0.00) +  
          ISNULL(S21,0.00) + ISNULL(S22,0.00) + ISNULL(S23,0.00) + ISNULL(S24,0.00) + ISNULL(S25,0.00) +   
          ISNULL(S26,0.00) + ISNULL(S27,0.00) + ISNULL(S28,0.00) + ISNULL(S29,0.00) + ISNULL(S30,0.00) +   
          ISNULL(S31,0.00) + ISNULL(S32,0.00) + ISNULL(S33,0.00) + ISNULL(S34,0.00) + ISNULL(S35,0.00) +   
          ISNULL(S36,0.00) + ISNULL(S37,0.00) + ISNULL(S38,0.00) + ISNULL(S39,0.00) + ISNULL(S40,0.00) +   
          ISNULL(S41,0.00) + ISNULL(S42,0.00) + ISNULL(S43,0.00) + ISNULL(S44,0.00) + ISNULL(S45,0.00) +   
          ISNULL(S46,0.00) + ISNULL(S47,0.00) + ISNULL(S48,0.00) + ISNULL(S49,0.00) + ISNULL(S50,0.00) +   
          ISNULL(S51,0.00) + ISNULL(S52,0.00) + ISNULL(S53,0.00) + ISNULL(S54,0.00)   
  WHERE ResumenPlaneacionCF.Usuario = @Usuario  
 DECLARE cRforcastCFNuk CURSOR FOR    
   SELECT Articulo FROM ResumenPlaneacionCF    
   WHERE ResumenPlaneacionCF.Usuario = @Usuario  
 OPEN cRforcastCFNuk    
 FETCH NEXT FROM cRforcastCFNuk INTO @Articulo    
 WHILE @@FETCH_STATUS <> -1 AND @@Error = 0     
   BEGIN    
  IF @@FETCH_STATUS <> -2     
    BEGIN     
      SELECT @Disponible = 0 , @Granel = 0    
 /***STOCK**/    
  UPDATE ResumenPlaneacionCF SET Stock =ROUND(ISNULL((ISNULL(Factorstock/100,0.00)*ISNULL(ResumenPlaneacionCF.Venta,0.00)),0),2) WHERE Articulo = @Articulo AND ResumenPlaneacionCF.Usuario = @Usuario    
 SELECT @Disponible = NULL   
  EXEC spArtDisponibleForecast @Empresa, @Articulo,  @Disponible  OUTPUT  
  UPDATE ResumenPlaneacionCF SET InvEmp =ROUND(ISNULL((@Disponible),0),2) WHERE Articulo = @Articulo  AND ResumenPlaneacionCF.Usuario = @Usuario  
  /***TotalInventario**/    
  UPDATE ResumenPlaneacionCF SET TotalInv =ROUND(ISNULL(@Disponible,0),2)    
   WHERE Articulo = @Articulo   AND ResumenPlaneacionCF.Usuario = @Usuario  
     UPDATE ResumenPlaneacionCF SET 
         ResumenPlaneacionCF.Producir = dbo.fnMayor(ROUND(ISNULL((ISNULL(ResumenPlaneacionCF.Venta,0.00)+ISNULL(ResumenPlaneacionCF.Stock,0.00)-ISNULL(ResumenPlaneacionCF.TotalInv,0.00)),0),2),0.00)    
       WHERE ResumenPlaneacionCF.Articulo = @Articulo    
      AND ResumenPlaneacionCF.Usuario = @Usuario   
  --/***kg**/    
   UPDATE ResumenPlaneacionCF 
     SET ResumenPlaneacionCF.KG =ROUND(ISNULL((ISNULL(Producir,0.00) * ISNULL(Gramaje,0.00)),0),2) 
   WHERE ResumenPlaneacionCF.Articulo = @Articulo   
     AND ResumenPlaneacionCF.Usuario = @Usuario    
   END    
   FETCH NEXT FROM cRforcastCFNuk INTO @Articulo    
   END    
   CLOSE cRforcastCFNuk    
   DEALLOCATE cRforcastCFNuk    
  UPDATE ResumenPlaneacionCF   
      SET ResumenPlaneacionCF.Stok15 = ISNULL(ResumenPlaneacionCF.Venta,0.00) * ISNULL(ResumenPlaneacionCF.Factorstock/100,0)    
    WHERE ResumenPlaneacionCF.Usuario = @Usuario  
      EXEC spFCProducirAsignar @Usuario, @Ejercicio, @Periodo   
IF  @EnSilencio = 0 SELECT * FROM ResumenPlaneacionCF  WHERE ResumenPlaneacionCF.Usuario = @Usuario  
 RETURN    
END  
GO

/**************** PR_MRP_PREVIO_MATERIA_PRIMA ****************/
if exists (select * from sysobjects where id = object_id('dbo.PR_MRP_PREVIO_MATERIA_PRIMA') and type = 'P') DROP PROCEDURE dbo.PR_MRP_PREVIO_MATERIA_PRIMA
GO
CREATE PROCEDURE [dbo].[PR_MRP_PREVIO_MATERIA_PRIMA]      
                      @Ejercicio        int,   
       @Periodo         int,   
       @Semana          int,   
       @CentroTrabajo   varchar(10), 
    @Item            varchar(20)  = NULL 
AS  BEGIN      
 SET NOCOUNT ON      
 DECLARE @PRODSERIELOTE VARCHAR(50),      
      @ARTICULO  VARCHAR(20)
     ,@ALMACEN VARCHAR(20)      
     ,@CENTRO VARCHAR(10)      
     ,@UNIDAD VARCHAR(50)      
     ,@SUCURSAL INT      
     ,@SUCURSALORIGEN INT      
     ,@KILOS FLOAT      
     ,@LOTE VARCHAR(50)      
     ,@BULTOS INT      
     ,@CANTIDAD FLOAT      
     ,@CONTADOR AS INT      
     ,@OC INT      
     ,@CM INT      
     ,@SL_EXISTENCIA FLOAT      
     ,@SL_EXISTECIABTO FLOAT      
     ,@SL_SERIELOTE VARCHAR(50)      
     ,@SL_ASIGNADO FLOAT      
     ,@SL_SALDO FLOAT      
     ,@BANDERA BIT      
     ,@CATEGORIA VARCHAR(50)      
 DECLARE @EMPRESA AS VARCHAR(20)        
 DECLARE @ArticuloMRP AS VARCHAR(20)      
 DECLARE @Total AS FLOAT      
 DECLARE @TotalMP AS FLOAT      
 DECLARE @REQUERIDO AS FLOAT      
 DECLARE @MATERIAL_SELECCION AS VARCHAR(20)      
 DECLARE @ALMACEN_SELECCION AS VARCHAR(20)      
 SELECT      
  @EMPRESA = Empresa      
 FROM Empresa      
 SET @CONTADOR = 1      
 /*LOTEAR POR PEPS PARA CONSUMO DE MATERIAL*/      
 CREATE TABLE #SERIELOTE (      
  ID INT IDENTITY (1, 1)      
    ,ARTICULO VARCHAR(20)      
    ,ALMACEN VARCHAR(30)      
    ,SERIELOTE VARCHAR(50)      
    ,EXISTENCIA FLOAT NULL      
    ,EXISTENCIABTO FLOAT NULL      
    ,ULTIMAENTRADA DATETIME NULL      
    ,ASIGNADO FLOAT NULL      
    ,SALDO FLOAT NULL      
 )      
 CREATE TABLE #SERIELOTEPEPS(      
  ID INT IDENTITY(1,1),      
  EMPRESA VARCHAR(20),       
  SEMANA INT,      
  ALMACEN VARCHAR(50),      
  ARTICULO VARCHAR(20),       
  MATERIAL VARCHAR(20),       
  SERIELOTE VARCHAR(50),       
  CANTIDAD FLOAT,       
  CANTIDADBTO INT,       
  REQUERIDO FLOAT      
 )      
 IF (OBJECT_ID('UT_MRP_PREVIO_MATERIA_PRIMA') IS NOT NULL) DROP TABLE UT_MRP_PREVIO_MATERIA_PRIMA      
 CREATE TABLE UT_MRP_PREVIO_MATERIA_PRIMA      
 (      
  EMPRESA VARCHAR(5),      
  SEMANA INT,       
  ALMACEN VARCHAR(10),       
  ARTICULO VARCHAR(20),       
  MATERIAL VARCHAR(20),       
  SERIELOTE VARCHAR(50),       
  CANTIDAD FLOAT,        
  CANTIDADBTO INT,      
  REQUERIDO FLOAT      
 )      
 IF (OBJECT_ID('TEMPDB..#SERIELOTECAPTURADO') IS NOT NULL) DROP TABLE #SERIELOTECAPTURADO      
 CREATE TABLE #SERIELOTECAPTURADO (      
  ID INT IDENTITY (1, 1)      
  ,ARTICULO VARCHAR(20)      
  ,ALMACEN VARCHAR(20)      
  ,SERIELOTE VARCHAR(50)      
  ,EXISTENCIA FLOAT NULL      
  ,EXISTENCIABTO FLOAT NULL      
 )      
 IF (OBJECT_ID('TEMPDB..#SERIELOTEASIGNADO') IS NOT NULL) DROP TABLE #SERIELOTEASIGNADO      
 CREATE TABLE #SERIELOTEASIGNADO (      
  ID INT IDENTITY (1, 1)      
  ,ARTICULO VARCHAR(20)      
  ,ALMACEN VARCHAR(20)      
  ,SERIELOTE VARCHAR(50)      
  ,EXISTENCIA FLOAT NULL      
  ,EXISTENCIABTO FLOAT NULL      
  ,ULTIMAENTRADA DATETIME NULL      
  ,ASIGNADO FLOAT NULL      
  ,SALDO FLOAT NULL      
 )      
 /*TABLA DONDE SE DEBE HACER EL CAMBIO POR LA TABLA DONDE SE GUARDA EL PLAN DE PRODUCCION MOSTRADO EN MRP */      
 --################################################################################################################################################################      
 INSERT INTO #SERIELOTE      
  SELECT      
   S.ARTICULO      
     ,S.ALMACEN      
     ,S.SERIELOTE      
     ,SUM(EXISTENCIA) AS EXISTENCIA      
     ,SUM(EXISTENCIABTO) AS EXISTENCIABTO      
     ,ULTIMAENTRADA      
     ,0.00 AS ASIGNADO      
     ,SUM(EXISTENCIA) AS SALDO      
  FROM SERIELOTE S      
  INNER JOIN (      
   SELECT DISTINCT      
    c.Almacen      
      ,AM.Material      
   FROM ForecastPlanSemanal AS a      
   INNER JOIN ForecastPlanSemanalD AS b      
    ON a.ID = b.ID      
   INNER JOIN Centro c      
    ON a.CentroTrabajo = c.Centro      
   INNER JOIN ArtMaterial AS AM      
    ON AM.Articulo = b.Articulo      
    AND AM.Almacen = c.Almacen      
   WHERE a.Situacion IN ('Autorizado')      
     AND     
       a.Ejercicio = @Ejercicio    
   AND a.Periodo = @Periodo    
   AND a.CentroTrabajo = @CentroTrabajo  
   AND a.Semana = @Semana  
   AND ISNULL(b.Articulo, '') = ISNULL(ISNULL(@Item, b.Articulo), '')
   ) AS FR      
   ON S.Articulo = FR.Material      
    AND S.Almacen = FR.Almacen      
  WHERE S.Existencia > 0      
  GROUP BY S.ARTICULO      
    ,S.ALMACEN      
    ,S.SERIELOTE      
    ,S.ULTIMAENTRADA      
  ORDER BY S.ARTICULO, S.Almacen, S.ULTIMAENTRADA      
 DECLARE @NOREGISTROS INT      
 DECLARE curPRODDFACTOR CURSOR FOR       
 SELECT      
  a.Semana      
    ,c.Almacen      
    ,b.Articulo      
    ,AM.Material      
    ,SUM(AM.Cantidad * b.Total) AS Cantidad      
 FROM ForecastPlanSemanal AS a      
 INNER JOIN ForecastPlanSemanalD AS b      
  ON a.ID = b.ID      
 INNER JOIN Centro c      
  ON a.CentroTrabajo = c.Centro      
 INNER JOIN ArtMaterial AS AM      
  ON AM.Articulo = b.Articulo      
  AND AM.Almacen = c.Almacen      
  --WHERE B.Articulo = 'A2502' AND AM.Material = 'A5263'      
  --WHERE --a.Situacion IN ('Autorizado')      
  WHERE a.Ejercicio = @Ejercicio    
    AND a.Periodo = @Periodo    
    AND a.CentroTrabajo = @CentroTrabajo  
    AND a.Semana = @Semana  
    AND a.Situacion IN ('Autorizado')
 AND ISNULL(b.Articulo, '') = ISNULL(ISNULL(@Item, b.Articulo), '')
 GROUP BY a.Semana      
   ,c.Almacen      
   ,b.Articulo      
   ,AM.Material      
   ,AM.Cantidad      
 ORDER BY AM.Material, c.Almacen, b.Articulo, a.Semana      
 OPEN curPRODDFACTOR      
 FETCH curPRODDFACTOR INTO @SEMANA, @ALMACEN, @ARTICULOMRP, @ARTICULO, @CANTIDAD      
 WHILE (@@fetch_status = 0)      
 BEGIN      
 SELECT @CATEGORIA = CATEGORIA FROM ART WHERE ARTICULO = @ARTICULO  
  --################################################################################################################################################################      
  IF ISNULL(@MATERIAL_SELECCION,'') <> ISNULL(@ARTICULO, '') OR ISNULL(@ALMACEN_SELECCION,'') <> ISNULL(@ALMACEN,'')      
  BEGIN      
   --SELECT '1.' + ISNULL(@MATERIAL_SELECCION,''), ISNULL(@ARTICULO, '')       
   --IF (OBJECT_ID('TEMPDB..#SERIELOTEASIGNADO') IS NOT NULL) DROP TABLE #SERIELOTEASIGNADO      
   --CREATE TABLE #SERIELOTEASIGNADO (      
   -- ID INT IDENTITY (1, 1)      
   -- ,ARTICULO VARCHAR(20)      
   -- ,ALMACEN VARCHAR(20)      
   -- ,SERIELOTE VARCHAR(50)      
   -- ,EXISTENCIA FLOAT NULL      
   -- ,EXISTENCIABTO FLOAT NULL      
   -- ,ULTIMAENTRADA DATETIME NULL      
   -- ,ASIGNADO FLOAT NULL      
   -- ,SALDO FLOAT NULL      
   --)      
   INSERT INTO #SERIELOTEASIGNADO      
    SELECT      
     ARTICULO      
     ,ALMACEN      
     ,SERIELOTE      
     ,EXISTENCIA      
     ,EXISTENCIABTO      
     ,ULTIMAENTRADA      
     ,ASIGNADO      
     ,SALDO      
    FROM #SERIELOTE      
    WHERE ARTICULO = @ARTICULO      
    AND ALMACEN = @ALMACEN      
    --AND SALDO > 0      
   IF ISNULL(@MATERIAL_SELECCION,'')=''      
    SET @CONTADOR = 1      
   ELSE      
    SET @CONTADOR = @CONTADOR + 1      
   SELECT      
    @NOREGISTROS = COUNT(SERIELOTE)      
    ,@BANDERA = 0         
   FROM #SERIELOTEASIGNADO      
  END       
  SET @REQUERIDO = @CANTIDAD      
  /*CICLO PARA ASIGNAR LOTES*/      
  WHILE @CANTIDAD > 0 --@CONTADOR <= @NOREGISTROS AND @CANTIDAD > 0      
  BEGIN      
   --SELECT TOP 1       
   -- A.EXISTENCIA - ISNULL(SUM(B.EXISTENCIA),0)      
   --   ,A.EXISTENCIABTO - ISNULL(SUM(B.EXISTENCIABTO),0)      
   --   ,A.SERIELOTE      
   --   ,A.ASIGNADO      
   --   ,A.SALDO - ISNULL(SUM(B.EXISTENCIA),0)      
   --FROM #SERIELOTEASIGNADO AS A LEFT OUTER JOIN #SERIELOTECAPTURADO AS B      
   --ON A.ARTICULO = B.ARTICULO AND A.ALMACEN = B.ALMACEN AND A.SERIELOTE =B.SERIELOTE      
   ----WHERE ID = @CONTADOR      
   --WHERE A.ARTICULO = @ARTICULO AND A.ALMACEN = @ALMACEN      
   ----AND SALDO > 0      
   --GROUP BY A.EXISTENCIA, A.EXISTENCIABTO, A.SERIELOTE, A.ASIGNADO, A.SALDO, A.ULTIMAENTRADA      
   --HAVING A.SALDO - ISNULL(SUM(B.EXISTENCIA),0) > 0      
   --ORDER BY A.ULTIMAENTRADA      
   SELECT TOP 1       
    @SL_EXISTENCIA = A.EXISTENCIA - ISNULL(SUM(B.EXISTENCIA),0)      
      ,@SL_EXISTECIABTO = A.EXISTENCIABTO - ISNULL(SUM(B.EXISTENCIABTO),0)      
      ,@SL_SERIELOTE = A.SERIELOTE      
      ,@SL_ASIGNADO = A.ASIGNADO      
      ,@SL_SALDO = A.SALDO - ISNULL(SUM(B.EXISTENCIA),0)      
   FROM #SERIELOTEASIGNADO AS A LEFT OUTER JOIN #SERIELOTECAPTURADO AS B      
   ON A.ARTICULO = B.ARTICULO AND A.ALMACEN = B.ALMACEN AND A.SERIELOTE =B.SERIELOTE      
   --WHERE ID = @CONTADOR      
   WHERE A.ARTICULO = @ARTICULO AND A.ALMACEN = @ALMACEN        
   GROUP BY A.EXISTENCIA, A.EXISTENCIABTO, A.SERIELOTE, A.ASIGNADO, A.SALDO, A.ULTIMAENTRADA      
   HAVING A.SALDO - ISNULL(SUM(B.EXISTENCIA),0) > 0      
   ORDER BY A.ULTIMAENTRADA      
 --SELECT TOP 1       
 -- A.EXISTENCIA - ISNULL(SUM(B.EXISTENCIA),0)      
 -- ,A.EXISTENCIABTO - ISNULL(SUM(B.EXISTENCIABTO),0)      
 -- ,A.SERIELOTE      
 -- ,A.ASIGNADO      
 -- ,A.SALDO - ISNULL(SUM(B.EXISTENCIA),0)      
 --FROM #SERIELOTEASIGNADO AS A LEFT OUTER JOIN #SERIELOTECAPTURADO AS B      
 --ON A.ARTICULO = B.ARTICULO AND A.ALMACEN = B.ALMACEN AND A.SERIELOTE =B.SERIELOTE      
 ----WHERE ID = @CONTADOR      
 --WHERE A.ARTICULO = @ARTICULO AND A.ALMACEN = @ALMACEN        
 --GROUP BY A.EXISTENCIA, A.EXISTENCIABTO, A.SERIELOTE, A.ASIGNADO, A.SALDO, A.ULTIMAENTRADA      
 --HAVING A.SALDO - ISNULL(SUM(B.EXISTENCIA),0) > 0      
 --ORDER BY A.ULTIMAENTRADA         
 --SELECT * FROM #SERIELOTECAPTURADO      
 --PRINT ''      
   IF NOT EXISTS(      
    --SELECT *      
    -- FROM #SERIELOTEASIGNADO A LEFT OUTER JOIN #SERIELOTECAPTURADO AS B      
    --ON A.ARTICULO = B.ARTICULO AND A.ALMACEN = B.ALMACEN AND A.SERIELOTE =B.SERIELOTE      
    -- --WHERE ID = @CONTADOR      
    -- WHERE A.ARTICULO = @ARTICULO AND A.ALMACEN = @ALMACEN      
    -- GROUP BY A.SALDO      
    -- HAVING A.SALDO - ISNULL(SUM(B.EXISTENCIA),0) > 0         
    SELECT TOP 1       
     A.EXISTENCIA - ISNULL(SUM(B.EXISTENCIA),0)      
       ,A.EXISTENCIABTO - ISNULL(SUM(B.EXISTENCIABTO),0)      
       ,A.SERIELOTE      
       ,A.ASIGNADO      
       ,A.SALDO - ISNULL(SUM(B.EXISTENCIA),0)      
    FROM #SERIELOTEASIGNADO AS A LEFT OUTER JOIN #SERIELOTECAPTURADO AS B      
    ON A.ARTICULO = B.ARTICULO AND A.ALMACEN = B.ALMACEN AND A.SERIELOTE =B.SERIELOTE      
    WHERE A.ARTICULO = @ARTICULO AND A.ALMACEN = @ALMACEN        
    GROUP BY A.EXISTENCIA, A.EXISTENCIABTO, A.SERIELOTE, A.ASIGNADO, A.SALDO, A.ULTIMAENTRADA      
    HAVING A.SALDO - ISNULL(SUM(B.EXISTENCIA),0) > 0      
   )      
   BEGIN      
    SET @CANTIDAD = 0      
    SET @SL_SERIELOTE = ''      
    SET @BULTOS = 0      
    SET @SL_SALDO = 0      
    SELECT      
     @NOREGISTROS = COUNT(SERIELOTE)      
     ,@BANDERA = 0      
     ,@CONTADOR = 1      
    FROM #SERIELOTEASIGNADO      
   END      
   IF @CANTIDAD <= @SL_SALDO      
   BEGIN      
    SELECT      
     @BULTOS = CEILING(@CANTIDAD / Peso)  
    FROM Art      
    WHERE ARTICULO = @ARTICULO      
    INSERT INTO #SERIELOTECAPTURADO(ARTICULO, ALMACEN, EXISTENCIA, SERIELOTE, EXISTENCIABTO)      
    VALUES(@ARTICULO, @ALMACEN, @CANTIDAD, @SL_SERIELOTE, @BULTOS)        
    IF @CATEGORIA = 'GRANEL'      
    BEGIN      
     INSERT INTO #SERIELOTEPEPS (EMPRESA, SEMANA, MATERIAL, ARTICULO, SERIELOTE, ALMACEN, CANTIDAD, CANTIDADBTO, REQUERIDO)      
      VALUES (@EMPRESA, @SEMANA, @ARTICULO, @ARTICULOMRP, @SL_SERIELOTE, @ALMACEN, @CANTIDAD, 0, @REQUERIDO)      
    END      
    ELSE      
    BEGIN      
     INSERT INTO #SERIELOTEPEPS (EMPRESA, SEMANA, MATERIAL, ARTICULO, SERIELOTE, ALMACEN, CANTIDAD, CANTIDADBTO, REQUERIDO)      
     VALUES (@EMPRESA, @SEMANA, @ARTICULO, @ARTICULOMRP, @SL_SERIELOTE, @ALMACEN, @CANTIDAD, @BULTOS, @REQUERIDO)      
    END      
    SET @CANTIDAD = 0      
   END      
   IF @CANTIDAD > ISNULL(@SL_SALDO,0)      
   BEGIN      
   --SELECT '2. ', * FROM #SERIELOTEASIGNADO       
    IF @SL_SALDO<=0      
    BEGIN      
      SET @SL_SERIELOTE = ''      
      SET @BULTOS = 0      
      SET @SL_SALDO = 0      
    END      
    SELECT      
     @BULTOS = CEILING(@SL_SALDO / Peso)  
    FROM Art      
    WHERE ARTICULO = @ARTICULO      
    INSERT INTO #SERIELOTECAPTURADO(ARTICULO, ALMACEN, EXISTENCIA, SERIELOTE, EXISTENCIABTO)      
    VALUES(@ARTICULO, @ALMACEN, @SL_SALDO, @SL_SERIELOTE, @BULTOS)        
    IF @CATEGORIA = 'GRANEL'      
    BEGIN      
     INSERT INTO #SERIELOTEPEPS (EMPRESA, SEMANA, MATERIAL, ARTICULO,  ALMACEN, SERIELOTE, CANTIDAD, CANTIDADBTO, REQUERIDO)      
      VALUES (@EMPRESA, @SEMANA, @ARTICULO, @ARTICULOMRP, @ALMACEN, @SL_SERIELOTE, @SL_SALDO, 0, @REQUERIDO)      
    END      
    ELSE      
    BEGIN      
     INSERT INTO #SERIELOTEPEPS (EMPRESA, SEMANA, MATERIAL, ARTICULO, SERIELOTE, ALMACEN, CANTIDAD, CANTIDADBTO, REQUERIDO)      
      VALUES (@EMPRESA, @SEMANA, @ARTICULO, @ARTICULOMRP, @SL_SERIELOTE, @ALMACEN, @SL_SALDO, @BULTOS, @REQUERIDO)      
    END      
    SET @CANTIDAD = @CANTIDAD - @SL_SALDO      
    SET @CONTADOR = @CONTADOR + 1      
   END      
   --SET @CONTADOR = @CONTADOR + 1       
  END      
  SET @ALMACEN_SELECCION = @ALMACEN      
  SET @MATERIAL_SELECCION = @ARTICULO      
 FETCH curPRODDFACTOR INTO @SEMANA, @ALMACEN, @ARTICULOMRP, @ARTICULO, @CANTIDAD      
 END      
 CLOSE curPRODDFACTOR      
 DEALLOCATE curPRODDFACTOR                        
 /*BORRAR REGISTROS CON VALOR CERO*/      
 ;WITH RESULTADO AS (      
 SELECT ID,      
  ROW_NUMBER() OVER (PARTITION BY MATERIAL, ARTICULO, ALMACEN, SEMANA ORDER BY MATERIAL, ARTICULO, ALMACEN) AS ORDEN,       
  EMPRESA, SEMANA, ALMACEN, ARTICULO, MATERIAL, SERIELOTE, CANTIDAD,  CANTIDADBTO,       
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY MATERIAL, ARTICULO, ALMACEN, SEMANA ORDER BY MATERIAL, ARTICULO, ALMACEN) = 1 THEN REQUERIDO ELSE 0 END AS REQUERIDO      
 FROM #SERIELOTEPEPS       
 )      
 DELETE FROM RESULTADO WHERE REQUERIDO = 0 AND SERIELOTE = '' AND CANTIDAD = 0 AND CANTIDADBTO = 0       
 /*RESULTADO FINAL*/      
 ;WITH RESULTADO AS (      
 SELECT ID,      
  EMPRESA, SEMANA, ALMACEN, ARTICULO, MATERIAL, SERIELOTE, CANTIDAD,  CANTIDADBTO,       
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY MATERIAL, ARTICULO, ALMACEN, SEMANA ORDER BY MATERIAL, ARTICULO, ALMACEN) = 1 THEN REQUERIDO ELSE 0 END AS REQUERIDO      
 FROM #SERIELOTEPEPS       
 )      
 INSERT INTO UT_MRP_PREVIO_MATERIA_PRIMA(EMPRESA, SEMANA, ALMACEN, ARTICULO, MATERIAL, SERIELOTE, CANTIDAD, CANTIDADBTO, REQUERIDO)      
 SELECT EMPRESA, SEMANA, ALMACEN, ARTICULO, MATERIAL, SERIELOTE, CANTIDAD, CANTIDADBTO, REQUERIDO      
 FROM RESULTADO ORDER BY ID      
 IF (OBJECT_ID('TEMPDB..#SERIELOTEASIGNADO') IS NOT NULL) DROP TABLE #SERIELOTEASIGNADO      
 IF (OBJECT_ID('TEMPDB..#SERIELOTE') IS NOT NULL) DROP TABLE #SERIELOTE      
 IF (OBJECT_ID('TEMPDB..#SERIELOTEPEPS') IS NOT NULL) DROP TABLE #SERIELOTEPEPS       
 SET NOCOUNT OFF     
 SELECT UT_MRP_PREVIO_MATERIA_PRIMA.EMPRESA,  
        UT_MRP_PREVIO_MATERIA_PRIMA.SEMANA,   
  UT_MRP_PREVIO_MATERIA_PRIMA.ALMACEN,   
  UT_MRP_PREVIO_MATERIA_PRIMA.ARTICULO,   
  UT_MRP_PREVIO_MATERIA_PRIMA.MATERIAL,   
     Art.Descripcion1 AS Descripcion,   
  UT_MRP_PREVIO_MATERIA_PRIMA.SERIELOTE,   
  UT_MRP_PREVIO_MATERIA_PRIMA.CANTIDAD,   
  UT_MRP_PREVIO_MATERIA_PRIMA.CANTIDADBTO,   
  UT_MRP_PREVIO_MATERIA_PRIMA.REQUERIDO  
  FROM UT_MRP_PREVIO_MATERIA_PRIMA    
      JOIN Art ON UT_MRP_PREVIO_MATERIA_PRIMA.MATERIAL = Art.Articulo  
   --AND Art.Rama <> 'INSUMOS'      
END
GO

/**************** spWebFCFaltanteMateriaPrima ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebFCFaltanteMateriaPrima') and type = 'P') DROP PROCEDURE dbo.spWebFCFaltanteMateriaPrima
GO
CREATE PROCEDURE spWebFCFaltanteMateriaPrima        
              @Usuario      varchar(10),       
              @Ejercicio    int,       
              @Periodo      int      
AS BEGIN       
  CREATE TABLE #Existencia (          
  ARTICULO      varchar(20)  COLLATE Database_Default NULL,       
        DisponibilidadICF  float NULL,   
  InvRequerido           float NULL,  
  Faltante               float NULL,   
  INVENTARIOALMACENADOAVC      float NULL,      
  INVENTARIOALMACENADOPBC      float NULL,       
  EXISTENCIASAVC               float NULL,       
  ARRIBOSAVC                   float NULL,       
  EXISTENCIASPBC               float NULL)      
 INSERT INTO #Existencia(Articulo,InvRequerido)       
   SELECT ExplocionMatCF.ArticuloHijo, SUM(ISNULL(InvRequerido,0.00))     
    FROM          
    ExplocionMatCF     
 JOIN Art ON ExplocionMatCF.ArticuloHijo = Art.Articulo 
   WHERE  ExplocionMatCF.ArticuloHijo IS NOT NULL     
   AND ExplocionMatCF.Usuario = @Usuario    
   AND Art.SeProduce = 0
   GROUP BY ExplocionMatCF.ArticuloHijo 
 UPDATE #Existencia SET DISPONIBILIDADICF =  dbo.fnWebArtMaterialDisponible ('INCF', ARTICULO) 
 UPDATE #Existencia SET Faltante =  - (ISNULL(DISPONIBILIDADICF,0.00) - ISNULL(InvRequerido,0.00))  
   SELECT      
    #Existencia.Articulo    AS Articulo,       
    Art.Descripcion1        AS Descripcion,        
    ISNULL(CONVERT(decimal(18,0), ISNULL(#Existencia.InvRequerido,0.00)),0.00)         AS InventarioRequerido,      
    CONVERT(decimal(18,0), ISNULL(CONVERT(float,#Existencia.DisponibilidadICF),0.00))  AS DisponibilidadICF,  
    CONVERT(decimal(18,0),0.00)                                                        AS InventarioAlmacenadoAVC,       
    CONVERT(decimal(18,0),0.00)                                                        AS SolicitudTraspasoAVC,      
    ''                                                                                 AS SolicitudTraspasoAVCEstatus,  
    CONVERT(decimal(18,0),0.00)                                                        AS InventarioAlmacenadoPBC,       
    CONVERT(decimal(18,0),0.00)                                                        AS SolicitudTraspasoPBC,      
    ''                                                                                 AS SolicitudTraspasoPBCEstatus,   
    CONVERT(decimal(18,0),0.00)                                                        AS ExistenciasAVC,         
    CONVERT(decimal(18,0),0.00)                                                        AS SolicitudPrestamoCompraAVC,      
    ''                                                                                 AS SolicitudPrestamoCompraAVCEstatus,   
    CONVERT(decimal(18,0),0.00)                                                        AS ExistenciasPBC,         
    CONVERT(decimal(18,0),0.00)                                                        AS SolicitudPrestamoCompraPBC,      
    ''                                                                                 AS SolicitudPrestamoCompraPBCEstatus,   
    CONVERT(decimal(18,0),0.00)                                                        AS ArribosAVC,       
    CONVERT(decimal(18,0),0.00)                                                        AS RedireccionArriboAVC,      
    ''                                                                                 AS RedireccionArriboAVCEstatus,      
    CONVERT(decimal(18,0), dbo.fnMayor(ISNULL(Faltante,0.00),0))                                     AS Faltante,     
    0.00                                                                               AS InvMin,     
    0.00                                                                               AS InvMax   
    FROM #Existencia       
     LEFT OUTER JOIN  Art         ON #Existencia.Articulo = Art.Articulo      
    WHERE  Art.Grupo NOT IN ('INSUMOS DE PRODUCCION', 'SIN CLASIFICAR')          
    AND ISNULL(Faltante,0.00) > 0.00    
  RETURN       
  END 
GO

/**************** SpProduccionCF ****************/
if exists (select * from sysobjects where id = object_id('dbo.SpProduccionCF') and type = 'P') DROP PROCEDURE dbo.SpProduccionCF
GO
CREATE PROCEDURE SpProduccionCF                 
              @Usuario      varchar(10),             
              @Ejercicio    int,             
              @Periodo      int            
AS BEGIN             
DECLARE           
@Empresa char(5) = 'INCF'          
 EXEC spWebArtMaterialReqProrrateo @Empresa, @Usuario, @Ejercicio, @Periodo    
EXEC spWebExplocionCapacidad @Usuario
 SELECT           
  CentroTrabajo AS Centro,           
  ArticuloPadre,               
  DescripcionP,               
  ArticuloHijo,               
  DescripcionH,               
  Total,               
  Produciendo,               
  BobinaXConsumir,               
  Venta,               
  PorVenta,               
  InventarioP,               
  DOH,               
  Objetivo,               
  dbo.fnMayor(Planear, 0.00) AS Planear,                
  rendimiento,               
  ROUND(InvH,0) AS InvH ,             
  ROUND(InvRequerido,0) AS InvRequerido,               
  ROUND(InvFinal, 0) AS InvFinal,               
  Cubre,               
  Bandera,               
  Articulo,               
  CONVERT(decimal(18,0), dbo.fnMenor((ISNULL(InvH,0.00) / NULLIF(InvRequerido, 0)) *100, 100))  AS PorAlcance,            
  CONVERT(decimal(18,0),ISNULL(AlcanceDias,0.00)) AS AlcanceDias,           
  Nivel,       
  Stock,       
  StockPorcentaje,     
  SeProduce,     
  ISNULL(CapacidadProduccion,0) AS CapacidadProduccion,      
  Forecast,     
  Producir    
 FROM ExplocionMatCF              
 WHERE ExplocionMatCF.Usuario = @Usuario            
RETURN                
END  
GO

/**************** spWebInicio ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebInicio') and type = 'P') DROP PROCEDURE dbo.spWebInicio
GO
CREATE PROCEDURE [dbo].[spWebInicio]   
     @Usuario VARCHAR(10) = NULL  
 ,@Ejercicio INT = NULL  
 ,@Periodo INT = NULL  
 ,@Familia VARCHAR(255) = NULL  
 ,@Historico BIT = NULL  
 ,@EnSilencio BIT = NULL  
AS  
    BEGIN  
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>  
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM)   
        VALUES  
            ('spWebInicioDashboard'  
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') +   
            ', @Ejercicio: '  + ISNULL(CAST(@Ejercicio AS VARCHAR), 'NULL') +   
            ', @Periodo: '    + ISNULL(CAST(@Periodo   AS VARCHAR), 'NULL') +   
            ', @Familia: '    + ISNULL(@Familia, 'NULL') +   
            ', @Historico: '  + ISNULL(CAST(@Historico AS VARCHAR), 'NULL') +   
            ', @EnSilencio: ' + ISNULL(CAST(@EnSilencio AS VARCHAR), 'NULL')   
             );  
        --<MGOMEZ/2025.06.20/LOG USO| FIN>  
     DECLARE   
             @Total FLOAT  
      ,@Div1 FLOAT  
      ,@Div2 FLOAT  
      ,@Div3 FLOAT  
      ,@Div4 FLOAT  
      ,@Div5 FLOAT  
      ,@Capacidadhrs FLOAT  
      ,@CapacidadHras FLOAT  
      ,@CapacidadPzas FLOAT  
      ,@CentroTrabajo VARCHAR(10)  
     SELECT @Historico = ISNULL(@Historico, 0)  
      ,@EnSilencio = ISNULL(@EnSilencio, 0)  
     IF @Historico = 0  
     BEGIN  
      EXEC ProgProdSemillasNukA @Usuario  
      EXEC ProgProdProcesadosNukA @Usuario  
      DELETE WebInicio  
      WHERE Usuario = @Usuario  
      INSERT INTO WebInicio (  
       Usuario  
       ,CentroTrabajo  
       ,Venta  
       ,AProducir  
       ,TiempoExtra  
       ,Ocupacion  
       ,PzasLibres  
       ,DiasHAbiles  
       ,DiasTextra  
       ,CapacidadHrs  
       ,maq1  
       ,maq2  
       ,Familia  
       )  
      SELECT @Usuario  
       ,CentroTrabajo  
       ,Venta  
       ,AProducir  
       ,TiempoExtra  
       ,Ocupacion  
       ,(Ocupacion - AProducir)  
       ,DiasHAbiles  
       ,DiasTextra  
       ,CapacidadHrs  
       ,1  
       ,0  
       ,Familia  
      FROM ProgramaProdSemillasA  
      WHERE ProgramaProdSemillasA.Usuario = @Usuario  
      DECLARE crCentro CURSOR  
      FOR  
      SELECT WebInicio.CentroTrabajo  
      FROM WebInicio  
      WHERE WebInicio.Usuario = @Usuario  
       AND WebInicio.CentroTrabajo NOT IN ('Total')  
      OPEN crCentro  
      FETCH NEXT  
      FROM crCentro  
      INTO @CentroTrabajo  
      WHILE @@FETCH_STATUS <> - 1  
      BEGIN  
       IF @@FETCH_STATUS <> - 2  
       BEGIN  
        SELECT @CapacidadHras = NULL  
         ,@CapacidadPzas = NULL  
         ,@Div1 = NULL  
        EXEC spFCCentroCapacidadReal @Usuario  
         ,@CentroTrabajo  
         ,@CapacidadHras OUTPUT  
         ,@CapacidadPzas OUTPUT  
        UPDATE WebInicio  
        SET WebInicio.Capacidadhrs = @CapacidadHras  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        UPDATE WebInicio  
        SET WebInicio.HorasProgram = ((AProducir * Capacidadhrs) / NULLIF(Ocupacion, 0))   
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        UPDATE WebInicio  
        SET WebInicio.PorOcupacion = ((HorasProgram / Capacidadhrs) * 100)  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        UPDATE WebInicio  
        SET WebInicio.TiempoExtra = (HorasProgram - Capacidadhrs)  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        UPDATE WebInicio  
        SET WebInicio.Maq1 = (Aproducir - Ocupacion)  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        SELECT @Div1 = count(CentroTrabajo)  
        FROM WebInicio  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
        UPDATE WebInicio  
        SET WebInicio.Ocupacion = (WebInicio.Ocupacion / @Div1)  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
          UPDATE WebInicio  
        SET Inventario = dbo.fnInvForecastDesglosado(@Usuario, @CentroTrabajo)  
        WHERE WebInicio.CentroTrabajo = @CentroTrabajo  
         AND WebInicio.Usuario = @Usuario  
       END  
       FETCH NEXT  
       FROM crCentro  
       INTO @CentroTrabajo  
      END  
      CLOSE crCentro  
      DEALLOCATE crCentro  
      UPDATE WebInicio  
      SET Maq1 = 0  
      WHERE Maq1 < 0  
       AND Usuario = @Usuario  
      INSERT INTO WebInicio (  
       Usuario  
       ,CentroTrabajo  
       ,TiempoExtra  
       ,Ocupacion  
       ,HorasProgram  
       ,Capacidadhrs  
       ,Venta  
       ,AProducir  
       ,Inventario  
       ,PorOcupacion  
       ,PzasLibres  
       )  
      SELECT @Usuario  
       ,'Total'  
       ,ROUND(SUM(ISNULL(CASE   
           WHEN ISNULL(WebInicio.TiempoExtra, 0.00) < 0  
            THEN 0  
           ELSE ISNULL(WebInicio.TiempoExtra, 0.00)  
           END, 0)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.Ocupacion, 0)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.HorasProgram, 0.00)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.Capacidadhrs, 0.00)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.Venta, 0.00)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.AProducir, 0.00)), 0)  
       ,ROUND(SUM(ISNULL(WebInicio.Inventario, 0.00)), 0)  
       ,ROUND(dbo.fnPorcentajeImporte(SUM(ISNULL(Capacidadhrs, 0.00)), SUM(ISNULL(HorasProgram, 0.00))), 0)  
       ,ROUND(SUM(ISNULL(dbo.fnMayor(WebInicio.PzasLibres, 0), 0.00)), 0)  
      FROM WebInicio  
      WHERE WebInicio.Usuario = @Usuario  
     END  
     IF @EnSilencio = 0  
     BEGIN  
      SELECT CentroTrabajo AS CentroTrabajo  
       ,ISNULL(SUM(Venta), 0) AS 'Venta'  
       ,ISNULL(SUM(AProducir), 0) AS 'AProducir'  
       ,ISNULL(dbo.fnMayor(SUM(TiempoExtra), 0), 0) AS 'TiempoExtra'  
       ,ISNULL(SUM(Ocupacion), 0) AS 'Ocupacion'  
       ,ISNULL(dbo.fnMayor(SUM(PzasLibres), 0), 0) AS 'PzasLibres'  
       ,ISNULL(SUM(DiasHAbiles), 0) AS 'DiasHAbiles'  
       ,ISNULL(SUM(DiasTextra), 0) AS 'DiasTextra'  
       ,ISNULL(SUM(CapacidadHrs), 0) AS 'CapacidadHrs'  
       ,ISNULL(SUM(maq1), 0) AS 'Maq1'  
       ,ISNULL(SUM(maq2), 0) AS 'Maq2'  
       ,ISNULL(SUM(HorasProgram), 0) AS 'HorasProgram'  
       ,ISNULL(SUM(PorOcupacion), 0) AS 'PorOcupacion'  
       ,ISNULL(SUM(Inventario), 0) AS 'Inventario'  
       ,ROUND(NULLIF(SUM(ISNULL(Venta, 0.00)), 0) / NULLIF(SUM(ISNULL(Inventario, 0.00)), 0), 2) AS 'DOH'  
      FROM WebInicio  
      WHERE Usuario = @Usuario  
      GROUP BY CentroTrabajo  
     END  
     RETURN  
    END  
GO

/**************** spProgramaProduccionConcentrado ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProduccionConcentrado') and type = 'P') DROP PROCEDURE dbo.spProgramaProduccionConcentrado
GO
CREATE   PROCEDURE spProgramaProduccionConcentrado 
     @Usuario VARCHAR(10)
 ,@Ejercicio INT
 ,@Periodo INT
 ,@Semana INT
AS
    BEGIN
     DECLARE 
             @Empresa   CHAR(5) = 'INCF'
      ,@FechaD    DATETIME
      ,@FechaA    DATETIME
     SELECT 
             @FechaD = DIM_TIEMPO_SEMANA.FECHAINICIO
      ,@FechaA = DIM_TIEMPO_SEMANA.FECHAFIN
     FROM DBO.DIM_TIEMPO_SEMANA
     WHERE 
            DBO.DIM_TIEMPO_SEMANA.AÑO   = @Ejercicio
     AND DIM_TIEMPO_SEMANA.MES       = @Periodo
     AND DIM_TIEMPO_SEMANA.SEMANA    = @Semana;
     SELECT 
             ID
      ,Ejercicio
      ,Periodo
      ,CentroTrabajo
      ,Semana
      ,Renglon
      ,Articulo
      ,Descripcion
      ,Lun
      ,Mar
      ,Mie
      ,Jue
      ,Vie
      ,Sab
      ,Dom
      ,PorProducir
      ,ISNULL(dbo.fnProducidoSemanalAcumArticulo(@Empresa, CentroTrabajo, Articulo, @FechaD, @FechaA), 0) AS Producido
     FROM ForecastPlanProduccion
     WHERE 
            Ejercicio = @Ejercicio
     AND Periodo = @Periodo
     AND Semana = @Semana;
     RETURN
    END
GO

/**************** spProgramaProdSituacion ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProdSituacion') and type = 'P') DROP PROCEDURE dbo.spProgramaProdSituacion
GO
CREATE   PROCEDURE SPPROGRAMAPRODSITUACION
         @ModuloID          int
        ,@Situacion         varchar(50)
        ,@SituacionUsuario  varchar(10)
        ,@Ok                int          OUTPUT
        ,@OkRef             varchar(255) OUTPUT   
AS 
    BEGIN   
        DECLARE   
             @Modulo            char(5) = 'PP'
            ,@SituacionFecha    datetime = GETDATE()
        UPDATE ForecastPlanSemanal   
        SET 
            Situacion         = @Situacion,   
            SituacionFecha    = @SituacionFecha,   
            SituacionUsuario  = @SituacionUsuario   
        WHERE ID = @ModuloID  
        IF @@ROWCOUNT = 0 SELECT @Ok = 53100  ELSE   
        IF @Ok IS NULL   
            BEGIN   
                INSERT INTO ProgramaProdSituacionLog (Modulo, ModuloID, Situacion, SituacionUsuario, SituacionFecha) 
                VALUES (@Modulo,@ModuloID,@Situacion,@SituacionUsuario,@SituacionFecha)
                IF @@ROWCOUNT = 0 
                    SELECT @Ok = 53100
            END   
        RETURN   
    END  
GO

/**************** spProgramaProdSituacionSemana ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProdSituacionSemana') and type = 'P') DROP PROCEDURE dbo.spProgramaProdSituacionSemana
GO
CREATE PROCEDURE [dbo].[spProgramaProdSituacionSemana]   
   @Usuario    varchar(10),     
   @Ejercicio  int,        
   @Periodo    int,    
   @Semana     int,   
   @Situacion  varchar(50), 
   @Centro     varchar(10)
AS BEGIN   
DECLARE  
    @Modulo    char(5)     = 'FC',   
 @Mov       varchar(20) = 'Plan Semanal',   
 @Ok        int,   
 @OkRef     varchar(255),   
 @ID        int,   
 @SituacionSiguiente varchar(50)  
 SELECT @SituacionSiguiente = dbo.fnSituacionSiguienteFC(@Modulo, @Mov, @Situacion)   
 BEGIN TRANSACTION      
     DECLARE crID CURSOR FOR       
      SELECT   
     ForecastPlanProduccion.ID  
   FROM ForecastPlanProduccion      
   WHERE ForecastPlanProduccion.Ejercicio = @Ejercicio    
     AND ForecastPlanProduccion.Periodo   = @Periodo     
     AND ForecastPlanProduccion.Semana    = @Semana  
  AND ForecastPlanProduccion.CentroTrabajo    = @Centro  
  GROUP BY   
        ForecastPlanProduccion.ID       
    OPEN crID      
    FETCH NEXT FROM crID INTO @ID   
    WHILE @@FETCH_STATUS <> -1      
    BEGIN      
      IF @@FETCH_STATUS <> -2       
      BEGIN   
      EXEC spProgramaProdSituacion @ID, @SituacionSiguiente, @Usuario, @Ok OUTPUT, @OkRef OUTPUT   
  /*OMP 29/11/2024*/ --> SE AGREGA EL PROCEDIMIENTO PARA LA GENERACIÓN DE ORDENES DE PRODUCCION
  /*<INICIO>*/
  IF @SituacionSiguiente = 'AUTORIZADO'
  BEGIN   
   EXEC PR_MRP_GENERA_OS @ID, @Ejercicio, @SEMANA, @Usuario --GENERAR ORDENES DE SURTIDO (INV)
  END
  /*</INICIO>*/
     
         
      END      
      FETCH NEXT FROM crID INTO @ID     
    END      
    CLOSE crID      
    DEALLOCATE crID   
  IF @Ok IS NULL                                  
  BEGIN                                  
    COMMIT TRANSACTION                                      
  END ELSE                                  
  BEGIN                                  
    ROLLBACK TRANSACTION                                  
    SELECT @OkRef = ISNULL(RTRIM(@OkRef), '') FROM MensajeLista WHERE Mensaje = @Ok                                    
  END                          
 SELECT @Ok AS Ok,                               
        @OkRef  AS OkRef   
RETURN   
END  
GO

/**************** spWebForecastFam12S ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastFam12S') and type = 'P') DROP PROCEDURE dbo.spWebForecastFam12S
GO
-- EXEC spWebForecastFam12S2 'MASERP', '20/11/2024'
CREATE PROCEDURE [dbo].[spWebForecastFam12S]                      @Usuario      varchar(10),         @FechaEmision datetime  AS BEGIN  DECLARE      @Empresa        char(5) = 'INCF',   @Ejercicio      int,   @Semana         int,   @Articulo       varchar(20), 
 @Cantidad       float, 
 @SemanaT        char(5), 
 @SQL            nvarchar(max),    
 @Parametros     nvarchar(max), 
 @S              varchar(5), 
 @Conteo         int  = 1,    @Familia        varchar(50),   @FechaD         datetime,   @FechaA         datetime    DELETE ForecastArtFam12   WHERE Usuario = @Usuario   CREATE TABLE #Forecast12 (
        Familia    varchar(50) COLLATE Database_Default NULL, 
  Articulo   varchar(20) COLLATE Database_Default NULL,  
  Semana     float NULL)          DECLARE crCalendario CURSOR FOR 
     SELECT CalendarioFC.Ano, 
         CalendarioFC.Semana 
       FROM CalendarioFC 
   WHERE CalendarioFC.Usuario = @Usuario
    OPEN crCalendario    
    FETCH NEXT FROM crCalendario INTO @Ejercicio,  @Semana
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN           SELECT  @SemanaT='S'+CONVERT(varchar, @Semana)    DELETE #Forecast12         
  SET  @Sql = 'INSERT INTO #Forecast12 (Familia, Semana)     
          SELECT Art.FamArtCF,             SUM(ISNULL('+@SemanaT+',0.00) * ISNULL(Art.GramajeFC,0.00))        FROM VacaPresupuestoVtaConD        JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaCon.ID = VacaPresupuestoVtaConD.ID        JOIN Art                   ON VacaPresupuestoVtaConD.Articulo = Art.Articulo       WHERE VacaPresupuestoVtaCon.Ejercicio =  @Ejercicio 
      AND VacaPresupuestoVtaCon.Estatus = "CONCLUIDO"
      GROUP BY Art.FamArtCF'
       SET @Parametros = '@Ejercicio int'    
       EXEC sp_executesql @Sql, @Parametros, @Ejercicio = @Ejercicio    
       
      DECLARE crFC CURSOR FOR 
     SELECT #Forecast12.Familia, 
            #Forecast12.Articulo, 
         SUM(ISNULL(Semana,0.00)) 
       FROM #Forecast12
      GROUP BY #Forecast12.Familia, 
               #Forecast12.Articulo    
     OPEN crFC    
     FETCH NEXT FROM crFC INTO @Familia, @Articulo, @Cantidad 
     WHILE @@FETCH_STATUS <> -1    
     BEGIN    
       IF @@FETCH_STATUS <> -2     
       BEGIN  
        SELECT @S = 'S'+CONVERT(varchar,@Conteo)
           IF NOT EXISTS(SELECT *FROM ForecastArtFam12 WHERE Familia = @Familia AND Usuario = @Usuario) 
                       INSERT INTO ForecastArtFam12 (Usuario, Familia) VALUES (@Usuario, @Familia)  
       SET @SQL = 'UPDATE ForecastArtFam12 SET '+@S+' = '+CONVERT(varchar,ROUND(@Cantidad,0)) 
                            +' WHERE Familia = '+ CHAR(39)+CONVERT(varchar, @Familia)+CHAR(39)  
         +' AND Usuario = '+ CHAR(39)+CONVERT(varchar, @Usuario )+CHAR(39) 
       EXEC (@SQL) 
       END    
       FETCH NEXT FROM crFC INTO @Familia, @Articulo, @Cantidad
     END    
     CLOSE crFC    
     DEALLOCATE crFC 
     SELECT @Conteo = @Conteo + 1 
      END    
      FETCH NEXT FROM crCalendario INTO @Ejercicio,  @Semana   
    END    
    CLOSE crCalendario    
    DEALLOCATE crCalendario
 --SELECT *FROM ForecastArtFam12 WHERE Usuario = 'MASERP'
     DECLARE crCalendario CURSOR FOR 
     SELECT CalendarioFC.FechaD, 
         CalendarioFC.FechaA, 
         CalendarioFC.NoSemana 
       FROM CalendarioFC 
   WHERE CalendarioFC.Usuario = @Usuario
    OPEN crCalendario    
    FETCH NEXT FROM crCalendario INTO @FechaD,  @FechaA, @Semana
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN               SELECT  @SemanaT='A'+CONVERT(varchar, @Semana) 
  SET  @Sql = 'UPDATE ForecastArtFam12 SET '+@SemanaT+' = dbo.fnWebArribosArtFamFechas("INCF", '+CHAR(39)+CONVERT(varchar, @Usuario)+CHAR(39)+', ForecastArtFam12.Familia, '+CHAR(39)+CONVERT(varchar(10), @FechaD, 103)+CHAR(39)+', '+CHAR(39)+CONVERT(varchar(10), @FechaA, 103)+CHAR(39)+')  
   WHERE Usuario = '+ CHAR(39)+CONVERT(varchar, @Usuario)+CHAR(39)   
  
       EXEC (@SQL) 
  
      END    
      FETCH NEXT FROM crCalendario INTO @FechaD,  @Fechaa, @Semana  
    END    
    CLOSE crCalendario    
    DEALLOCATE crCalendario
RETURN 
END 
-- SELECT *FROM ForecastArtFam12 WHERE Usuario = 'MASERP'
GO

/**************** spProgramaProdConcentadoCentro ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProdConcentadoCentro') and type = 'P') DROP PROCEDURE dbo.spProgramaProdConcentadoCentro
GO
CREATE PROCEDURE [dbo].[spProgramaProdConcentadoCentro] 
     @Usuario VARCHAR(10)
 ,@Ejercicio INT
 ,@Periodo INT
 ,@Semana INT
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spProgramaProdConcentadoCentro'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') + 
             ', @Ejercicio: ' + ISNULL(CAST(@Ejercicio AS VARCHAR), 'NULL') + 
             ', @Periodo: '   + ISNULL(CAST(@Periodo   AS VARCHAR), 'NULL') + 
             ', @Semana: '    + ISNULL(CAST(@Semana    AS VARCHAR), 'NULL') 
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     DECLARE 
             @Modulo CHAR(5) = 'FC'
      ,@Mov VARCHAR(20) = 'Plan Semanal'
      ,@Empresa CHAR(5) = 'INCF'
      ,@FechaD DATETIME
      ,@FechaA DATETIME
      ,@Situacion VARCHAR(50)
      ,@PermiteAvanzar BIT
      ,@SituacionPasos INT
     CREATE TABLE #ConcentadoCentro (
      Orden INT NULL
      ,Ejercicio INT NULL
      ,Periodo INT NULL
      ,Semana INT NULL
      ,Situacion VARCHAR(50) COLLATE Database_Default NULL
      ,Centro VARCHAR(10) COLLATE Database_Default NULL
      ,Lun FLOAT NULL
      ,Mar FLOAT NULL
      ,Mie FLOAT NULL
      ,Jue FLOAT NULL
      ,Vie FLOAT NULL
      ,Sab FLOAT NULL
      ,Total FLOAT NULL
      ,TotalKilos FLOAT NULL
      ,Producido FLOAT NULL
      ,ProducidoKgs FLOAT NULL
      )
     DELETE #ConcentadoCentro
     SELECT @FechaD = DIM_TIEMPO_SEMANA.FECHAINICIO
      ,@FechaA = DIM_TIEMPO_SEMANA.FECHAFIN
     FROM DIM_TIEMPO_SEMANA
     WHERE DIM_TIEMPO_SEMANA.AÑO = @Ejercicio
      AND DIM_TIEMPO_SEMANA.MES = @Periodo
      AND DIM_TIEMPO_SEMANA.SEMANA = @Semana
     SELECT @SituacionPasos = COUNT(*)
     FROM MovSituacionFC
     WHERE MovSituacionFC.Mov = @Mov
      AND MovSituacionFC.Modulo = @Modulo
     INSERT INTO #ConcentadoCentro (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,Situacion
      ,Centro
      ,Lun
      ,Mar
      ,Mie
      ,Jue
      ,Vie
      ,Sab
      ,Total
      ,TotalKilos
      ,Producido
      ,ProducidoKgs
      )
     SELECT 1
      ,ISNULL(@Ejercicio, ForecastPlanProduccion.Ejercicio)
      ,ISNULL(@Periodo, ForecastPlanProduccion.Periodo)
      ,ISNULL(@Semana, ForecastPlanProduccion.Semana)
      ,ForecastPlanProduccion.Situacion
      ,CentroFC.Centro
      ,SUM(ISNULL(ForecastPlanProduccion.Lun, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Mar, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Mie, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Jue, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Vie, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Sab, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00) * ISNULL(Art.GramajeFC, 1))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, @FechaD, @FechaA))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, @FechaD, @FechaA) * ISNULL(Art.GramajeFC, 0.00))
     FROM CentroFC
     LEFT JOIN ForecastPlanProduccion
      ON CentroFC.Centro = ForecastPlanProduccion.CentroTrabajo
       AND ForecastPlanProduccion.Ejercicio = @Ejercicio
       AND ForecastPlanProduccion.Periodo = @Periodo
       AND ForecastPlanProduccion.Semana = @Semana
     LEFT JOIN Art
      ON ForecastPlanProduccion.Articulo = Art.Articulo
     WHERE CentroFC.Forecast = 1
     GROUP BY ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.Semana
      ,CentroFC.Centro
      ,ForecastPlanProduccion.Situacion
     INSERT INTO #ConcentadoCentro (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,Centro
      ,Situacion
      ,Lun
      ,Mar
      ,Mie
      ,Jue
      ,Vie
      ,Sab
      ,Total
      ,TotalKilos
      ,Producido
      ,ProducidoKgs
      )
     SELECT 2
      ,#ConcentadoCentro.Ejercicio
      ,#ConcentadoCentro.Periodo
      ,#ConcentadoCentro.Semana
      ,'Total'
      ,''
      ,SUM(ISNULL(#ConcentadoCentro.Lun, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Mar, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Mie, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Jue, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Vie, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Sab, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Total, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.TotalKilos, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.Producido, 0.00))
      ,SUM(ISNULL(#ConcentadoCentro.ProducidoKgs, 0.00))
     FROM #ConcentadoCentro
     GROUP BY #ConcentadoCentro.Ejercicio
      ,#ConcentadoCentro.Periodo
      ,#ConcentadoCentro.Semana
     SELECT #ConcentadoCentro.Orden
      ,ISNULL(#ConcentadoCentro.Situacion, '') AS Situacion
      ,@SituacionPasos AS SituacionPasos
      ,ISNULL(MovSituacionFC.Orden, 0) AS SituacionPaso
      ,dbo.fnSituacionSiguientePermiteAvanzar(@Modulo, @Mov, #ConcentadoCentro.Situacion, @Usuario) AS PermiteAvanzar
      ,#ConcentadoCentro.Ejercicio
      ,#ConcentadoCentro.Periodo
      ,#ConcentadoCentro.Semana
      ,#ConcentadoCentro.Centro
      ,#ConcentadoCentro.Lun
      ,#ConcentadoCentro.Mar
      ,#ConcentadoCentro.Mie
      ,#ConcentadoCentro.Jue
      ,#ConcentadoCentro.Vie
      ,#ConcentadoCentro.Sab
      ,#ConcentadoCentro.Total
      ,#ConcentadoCentro.TotalKilos
      ,#ConcentadoCentro.Producido
      ,#ConcentadoCentro.ProducidoKgs
     FROM #ConcentadoCentro
     LEFT JOIN MovSituacionFC
      ON ISNULL(#ConcentadoCentro.Situacion, '') = MovSituacionFC.Situacion
       AND MovSituacionFC.Modulo = @Modulo
       AND MovSituacionFC.Mov = @Mov
     ORDER BY #ConcentadoCentro.Orden ASC
      ,#ConcentadoCentro.Centro
     RETURN
    END
GO

/**************** spFCArtLista ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCArtLista') and type = 'P') DROP PROCEDURE dbo.spFCArtLista
GO
CREATE PROCEDURE spFCArtLista
                   @Articulo varchar(20)
AS BEGIN
DECLARE 
@json varchar(max) 
SELECT @json =(
SELECT  
     Art.Articulo, 
  RTRIM(LTRIM(Art.Descripcion1)) AS Descripcion, 
 0.00 AS Lun, 
 0.00 AS Mar, 
 0.00 AS Mie,
 0.00 AS Jue, 
 0.00 AS Vie,
 0.00 AS Sab,
 0.00 AS Dom,
 0.00 AS Saldo, 
 0.00 AS Producido, 
 0.00 AS TotalPP,
 0.00 AS Total
FROM Art 
WHERE Art.Rama IN ('EMPACADOS', 'MAYOREO')
 AND Art.Estatus = 'ALTA'
 AND Art.Articulo = @Articulo
FOR JSON AUTO)
SELECT @json AS Json 
RETURN
END 
GO

/**************** spFCAsignarCfgDefaul ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCAsignarCfgDefaul') and type = 'P') DROP PROCEDURE dbo.spFCAsignarCfgDefaul
GO
CREATE PROCEDURE spFCAsignarCfgDefaul           
           @Usuario    varchar(10),           
           @Ejercicio  int,           
           @Periodo     int           
 AS BEGIN          
 DECLARE           
  @PrimerSemana int,             
  @NoSemanas    int,   
  @FechaEmision datetime = dbo.fnFechaSinHora(GETDATE()), 
  @FechaD       datetime, 
  @FechaA       datetime 
    EXEC spCalendarioFC12  @Usuario, @FechaEmision
    EXEC spArtCentroDefaul @Usuario, @Ejercicio          
    EXEC spFCAsignarBasesDefaul @Usuario        
    EXEC spFCForcastCFNuk @Usuario, @Ejercicio, @Periodo, 1    
    EXEC spBalanceCargarFC @Usuario   
    EXEC spWebForecast12 @Usuario, @FechaEmision  
 EXEC spWebForecastFam12S @Usuario, @FechaEmision 
  SELECT @FechaD = MIN(CalendarioFC.FechaD), @FechaA = MAX(CalendarioFC.FechaD) FROM CalendarioFC WHERE CalendarioFC.Usuario = @Usuario 
    EXEC spFCArribosVaca @Usuario, @FechaD, @FechaA
 SELECT @PrimerSemana = MIN(DIM_TIEMPO_SEMANA.SEMANA),           
        @NoSemanas    = COUNT(DIM_TIEMPO_SEMANA.SEMANA)            
   FROM DIM_TIEMPO_SEMANA           
   WHERE DIM_TIEMPO_SEMANA.Año = @Ejercicio            
  AND DIM_TIEMPO_SEMANA.Mes = @Periodo          
  SELECT @PrimerSemana AS PrimerSemana,           
         @NoSemanas    AS NumeroSemanas,       
   dbo.fnMesNumeroNombre(@Periodo) AS NombreMes       
RETURN           
END 
GO

/**************** spUsuarioPINValidar ****************/
if exists (select * from sysobjects where id = object_id('dbo.spUsuarioPINValidar') and type = 'P') DROP PROCEDURE dbo.spUsuarioPINValidar
GO
CREATE PROCEDURE spUsuarioPINValidar                     
            @Usuario    varchar(10),                     
            @PIN        varchar(50)                  
AS BEGIN                     
DECLARE                   
  @Empresa               char(5),                   
  @UPIN                  varchar(50),                      
  @Estatus               varchar(20),                   
  @Nombre                varchar(100),                   
  @AppEmbProgramacion    bit = 0,                                                 
  @AppEmbarque           bit = 0,                        
  @AppEmbRuta            bit = 0,        
  @AppInicio             bit = 0,                   
  @AppForecast           bit = 0,            
  @AppArribos            bit = 0,            
  @AppProduccion         bit = 0,            
  @AppTraspasos          bit = 0,            
  @AppCompras            bit = 0,            
  @AppAnalisis           bit = 0,            
  @AppIndicadores        bit = 0,            
  @AppTiempoExtra        bit = 0,      
  @AppModelado           bit = 0,        
  @AppAyuda              bit = 0,      
  @AppPlanProdEditar     bit = 0,     
  @AppPlanProdConsultar  bit = 0,     
  @AppMPDArribo          bit = 0,     
  @AppDashboard          bit = 0,   
  @AppArticulos          bit = 0, 
  @Url                   varchar(255),                         
  @Existe                bit = 0,                       
  @Ok                    int,                     
  @OkRef                 varchar(255)      
   SELECT @Usuario = UPPER(@Usuario)          
   IF NOT EXISTS(SELECT *FROM Usuario WHERE Usuario.Usuario = @Usuario)  SELECT  @Ok = 10060, @OkRef = 'No Existe el Usuario'          
 IF @Ok IS NULL         
 BEGIN           
SELECT                 
  @Estatus              = Usuario.Estatus,          
  @Nombre               = Usuario.Nombre,       
  @AppInicio            = Usuario.AppInicio,      
  @AppForecast          = Usuario.AppForecast,      
  @AppArribos           = Usuario.AppArribos,      
  @AppProduccion        = Usuario.AppProduccion,      
  @AppTraspasos         = Usuario.AppTraspasos,      
  @AppCompras           = Usuario.AppCompras,      
  @AppAnalisis          = Usuario.AppAnalisis,      
  @AppIndicadores       = Usuario.AppIndicadores,      
  @AppTiempoExtra       = Usuario.AppTiempoExtra,       
  @AppModelado          = Usuario.AppModelado,       
  @AppAyuda             = Usuario.AppAyuda,     
  @AppPlanProdEditar    = Usuario.AppPlanProdEditar,     
  @AppPlanProdConsultar = Usuario.AppPlanProdConsultar,     
  @AppMPDArribo         = Usuario.AppMPDArribo,   
  @AppDashboard         = Usuario.AppDashboard,  
  @AppArticulos         = Usuario.AppArticulos
  FROM Usuario                     
  WHERE  RTRIM(LTRIM(Usuario.Usuario))  =  @Usuario                    
IF @Estatus <> 'ALTA' AND @Ok IS NULL                    
   BEGIN                       
     IF @Estatus = 'BLOQUEADO'  SELECT  @Ok = 10060, @OkRef = 'Usuario Bloqueado' ELSE                     
     IF @Estatus = 'BAJA'       SELECT  @Ok = 10060, @OkRef = 'Usuario Baja'                          
   END                    
END         
SELECT @Ok                   AS Ok,                   
       @OkRef                AS OkRef,                   
       @Usuario              AS Usuario,                   
       @Nombre               AS Nombre,                    
       @Existe               AS ExisteImagen,                   
       @AppInicio            AS AppInicio,      
       @AppForecast          AS AppForecast,      
       @AppArribos           AS AppArribos,      
       @AppProduccion        AS AppProduccion,      
       @AppTraspasos         AS AppTraspasos,      
       @AppCompras           AS AppCompras,      
       @AppAnalisis          AS AppAnalisis,      
       @AppIndicadores       AS AppIndicadores,      
       @AppTiempoExtra       AS AppTiempoExtra,       
       @AppModelado          AS AppAppModelado,       
       @AppAyuda             AS AppAppAyuda,      
       1                     AS AppProgramaMensual,       
       1                     AS AppConcentradoFamilia,    
       @AppPlanProdEditar    AS AppPlanProdEditar,    
       @AppPlanProdConsultar AS AppPlanProdConsultar,      
       @AppMPDArribo         AS AppMPDArribo,   
       @AppDashboard         AS AppDashboard, 
    @AppArticulos         AS AppArticulos
RETURN                    
END 
GO

/**************** spWebForecastBBC12 ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebForecastBBC12') and type = 'P') DROP PROCEDURE dbo.spWebForecastBBC12
GO
--DROP PROCEDURE spWebForecastBBC122
CREATE PROCEDURE [dbo].[spWebForecastBBC12]                      @Usuario      varchar(10),         @FechaEmision datetime  AS BEGIN  DECLARE      @Empresa        char(5) = 'INCF',   @Ejercicio      int,   @Semana         int,   @Articulo       varchar(20), 
 @Cantidad       float, 
 @SemanaT        char(5), 
 @SQL            nvarchar(max),    
 @Parametros     nvarchar(max), 
 @Conteo         int  = 1,    @Familia        varchar(50),   @S1             float,   @S2             float,   @S3             float,   @S4             float,   @S5             float,   @S6             float,   @S7             float,   @S8             float,   @S9             float,   @S10            float,   @S11            float,   @S12            float,    @MArticulo      varchar(20),      @M1             float,   @M2             float,   @M3             float,   @M4             float,   @M5             float,   @M6             float,   @M7             float,   @M8             float,   @M9             float,   @M10            float,   @M11            float,   @M12            float,     @FechaD         datetime,         
    @FechaA         datetime, 
  @CentroDef      varchar(10),   @SeProduce      bit      CREATE TABLE #ArribosBBC12S (            
  ID                       int    NOT NULL IDENTITY(1,1),    
  Familia                  varchar(50) COLLATE Database_Default NULL,      
  Articulo                 varchar(20) COLLATE Database_Default NULL,              
  S1                       float NULL,         
  S2                       float NULL,         
  S3                       float NULL,         
  S4                       float NULL,         
  S5                       float NULL,         
  S6                       float NULL,         
  S7                       float NULL,         
  S8                       float NULL,         
  S9                       float NULL,         
  S10                      float NULL,         
  S11                      float NULL,    
  S12                      float NULL)        
          DELETE #ArribosBBC12S  DELETE ForecastBBC12 WHERE Usuario = @Usuario 
  DECLARE crArticulo CURSOR FOR             
        SELECT Arribos12.Articulo, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, Art.CentroDef        
         FROM Arribos12         
        JOIN Art ON Arribos12.Articulo = Art.Articulo        
     WHERE (ISNULL(S1,0.00) <> 0.00 OR ISNULL(S2,0.00)  <> 0.00 OR ISNULL(S3,0.00)  <> 0.00 OR ISNULL(S4,0.00)  <> 0.00 OR         
            ISNULL(S5,0.00) <> 0.00 OR ISNULL(S6,0.00)  <> 0.00 OR ISNULL(S7,0.00)  <> 0.00 OR ISNULL(S8,0.00)  <> 0.00 OR        
            ISNULL(S9,0.00) <> 0.00 OR ISNULL(S10,0.00) <> 0.00 OR ISNULL(S11,0.00) <> 0.00 OR ISNULL(S12,0.00) <> 0.00 )     
           AND Arribos12.Usuario = @Usuario 
    OPEN crArticulo            
    FETCH NEXT FROM crArticulo INTO @Articulo, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12, @CentroDef        
    WHILE @@FETCH_STATUS <> -1            
    BEGIN            
      IF @@FETCH_STATUS <> -2             
      BEGIN  
      DECLARE crSubProducto CURSOR FOR     
          SELECT 
        DISTINCT(Material),     
       Art.Familia,         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S1,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S2,0.0),0),            
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S3,0.0),0),           
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S4,0.0),0),         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S5,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S6,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S7,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S8,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S9,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S10,0.0),0),         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S11,0.0),0),      
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@S12,0.0),0), 
       Art.SeProduce
      FROM ArtMaterial                 
      JOIN Art ON Art.Articulo = ArtMaterial.Material                
      WHERE ArtMAterial.Articulo = @Articulo    
     OPEN crSubProducto    
     FETCH NEXT FROM crSubProducto INTO @MArticulo,@Familia,@M1,@M2,@M3,@M4,@M5,@M6,@M7,@M8,@M9,@M10,@M11,@M2, @SeProduce
     WHILE @@FETCH_STATUS <> -1    
     BEGIN    
       IF @@FETCH_STATUS <> -2     
       BEGIN    
       IF @Familia IN ('BOLSA', 'BOBINA', 'CAJA') AND @SeProduce = 0 
       BEGIN 
       INSERT INTO #ArribosBBC12S (Articulo, Familia, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12) VALUES
                                  (@MArticulo,@Familia,@M1,@M2,@M3,@M4,@M5,@M6,@M7,@M8,@M9,@M10,@M11,@M2)
       END ELSE 
       IF @SeProduce = 1
       BEGIN 
        INSERT INTO #ArribosBBC12S (Articulo, Familia, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12) 
         SELECT 
        DISTINCT(Material),     
       Art.Familia,         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M1,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M2,0.0),0),            
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M3,0.0),0),           
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M4,0.0),0),         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M5,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M6,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M7,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M8,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M9,0.0),0),        
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M10,0.0),0),         
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M11,0.0),0),      
       ROUND(ISNULL(ArtMaterial.Cantidad,0.00) * ISNULL(@M12,0.0),0)
      FROM ArtMaterial                 
      JOIN Art ON Art.Articulo = ArtMaterial.Material                
      WHERE ArtMAterial.Articulo = @MArticulo    
       AND Art.Familia IN ('BOLSA', 'BOBINA', 'CAJA') 
      END 
       END    
       FETCH NEXT FROM crSubProducto INTO @MArticulo,@Familia,@M1,@M2,@M3,@M4,@M5,@M6,@M7,@M8,@M9,@M10,@M11,@M2, @SeProduce   
     END    
     CLOSE crSubProducto    
     DEALLOCATE crSubProducto 
     END            
     FETCH NEXT FROM crArticulo INTO @Articulo, @S1, @S2, @S3, @S4, @S5, @S6, @S7, @S8, @S9, @S10, @S11, @S12, @CentroDef            
   END            
   CLOSE crArticulo            
   DEALLOCATE crArticulo 
    INSERT ForecastBBC12 (Usuario, Articulo, Familia, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12) 
    SELECT  @Usuario, 
      #ArribosBBC12S.Articulo, 
      #ArribosBBC12S.Familia, 
      SUM(ISNULL(#ArribosBBC12S.S1,0.00)),  
      SUM(ISNULL(#ArribosBBC12S.S2,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S3,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S4,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S5,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S6,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S7,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S8,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S9,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S10,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S11,0.00)), 
      SUM(ISNULL(#ArribosBBC12S.S12, 0.00))
       FROM #ArribosBBC12S
       GROUP BY 
      #ArribosBBC12S.Articulo, 
      #ArribosBBC12S.Familia
   DECLARE crCalendario CURSOR FOR 
     SELECT CalendarioFC.FechaD, 
         CalendarioFC.FechaA, 
         CalendarioFC.NoSemana 
       FROM CalendarioFC 
   WHERE CalendarioFC.Usuario = @Usuario
    OPEN crCalendario    
    FETCH NEXT FROM crCalendario INTO @FechaD,  @FechaA, @Semana
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN                 SELECT  @SemanaT='A'+CONVERT(varchar, @Semana)
  SET  @Sql = 'UPDATE ForecastBBC12 
                 SET '+@SemanaT+' = dbo.fnWebArribosArtFechas('+CHAR(39)+CONVERT(varchar, @Empresa)+CHAR(39)+','
                                                      +CHAR(39)+CONVERT(varchar, @Usuario)+CHAR(39)+', 
                                                      ForecastBBC12.Articulo, '+
                  CHAR(39)+CONVERT(varchar(10), @FechaD, 103)+CHAR(39)+', '+
                     CHAR(39)+CONVERT(varchar(10), @FechaA, 103)+CHAR(39)+')  
                                            WHERE Usuario = '+ CHAR(39)+CONVERT(varchar, @Usuario)+CHAR(39) 
       EXEC (@SQL) 
      END    
      FETCH NEXT FROM crCalendario INTO @FechaD,  @Fechaa, @Semana  
    END    
    CLOSE crCalendario    
    DEALLOCATE crCalendario
END 
GO

/**************** spFC_PP_PlanSemana ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFC_PP_PlanSemana') and type = 'P') DROP PROCEDURE dbo.spFC_PP_PlanSemana
GO
CREATE PROCEDURE spFC_PP_PlanSemana                  
                      @Usuario       varchar(10),                   
                      @Ejercicio     int,                   
                      @Periodo       int,                   
                      @ID            int,                   
                      @Semana        int,                   
                      @CentroTrabajo varchar(20)                  
AS BEGIN                   
DECLARE                   
  @Empresa           char(5) = 'INCF',                   
  @FechaD            datetime,                   
  @FechaA            datetime,                   
  @SQL               nvarchar(max),                    
  @Parametros        nvarchar(max),                    
  @S1                char(10),                   
  @PPSID             int,                   
  @JsonData          NVARCHAR(MAX) = '[',                  
  @Situacion         varchar(50),                   
  @SituacionUsuario  varchar(10),             
  @PermiteAvanzar         bit  = 0,           
  @FechaMD            datetime,                   
  @FechaMA            datetime,       
  @FCID               int      
  EXEC spIntToDateTime 1, @Periodo, @Ejercicio, @FechaMD OUTPUT         
 SELECT @FechaMA = dbo.fnUltimoDiaMes(@FechaMD)         
 SELECT @PPSID = ForecastPlanSemanal.ID,       
        @FCID  = ForecastPlanSemanal.FCID       
  FROM ForecastPlanSemanal                   
 WHERE ForecastPlanSemanal.Empresa = @Empresa                   
   AND ForecastPlanSemanal.Ejercicio = @Ejercicio                   
   AND ForecastPlanSemanal.Periodo = @Periodo                   
   AND ForecastPlanSemanal.Semana = @Semana                  
   AND ForecastPlanSemanal.CentroTrabajo  = @CentroTrabajo       
  CREATE TABLE #PlanSemanal (              
            Partida            int         NULL,             
            ID                 int         NOT NULL IDENTITY(1,1),                  
   Situacion          varchar(50) COLLATE Database_Default NULL,                   
   SituacionUsuario   varchar(10) COLLATE Database_Default NULL,                 
   SituacionFecha     datetime  NULL,                 
   Estacion           varchar(255) COLLATE Database_Default NULL,                    
   Articulo           varchar(20) COLLATE Database_Default NULL,                      
   Lun                float  NULL,                  
   Mar                float  NULL,                   
   Mie                float  NULL,                   
   Jue                float  NULL,                  
   Vie                float  NULL,                   
   Sab                float  NULL,                   
   Dom                float  NULL,                   
   Total              float  NULL,                 
   Saldo              float  NULL,         
   Producido          float  NULL,     
   TotalPP            float  NULL, 
   TotalKilos         float  NULL)                   
 DELETE #PlanSemanal                   
 SELECT  @FechaD = FechaD, @FechaA = FechaA FROM  dbo.fnDim_Tiempo_Semana(@Ejercicio, @Periodo)  WHERE Semana = @Semana          
IF @PPSID IS NULL                   
BEGIN                   
  INSERT INTO #PlanSemanal (Partida, Estacion, Articulo, Lun, Mar, Mie, Jue, Vie, Sab, Dom, Total, Saldo, Producido, TotalPP, Totalkilos)                   
  SELECT              
    1,             
    NULL,                 
    BalanceFCHist.Articulo,                   
    0.00 AS Lun,                  
    0.00 AS Mar,                  
    0.00 AS Mie,                  
    0.00 AS Jue,                  
    0.00 AS Vie,                  
    0.00 AS Sab,                  
    0.00 AS Dom,                   
    ISNULL(BalanceFCHist.Producir,0.00),                 
    dbo.fnForecastPlanSemanalAcum (@Ejercicio, @Periodo,  @CentroTrabajo, BalanceFCHist.Articulo, BalanceFCHist.Producir),         
    dbo.fnProducidoSemanalAcumArticulo ('INCF', @CentroTrabajo, BalanceFCHist.Articulo, @FechaD, @FechaA),     
    0.00, 
 0.00
  FROM BalanceFCHist WHERE                   
       BalanceFCHist.ID = ISNULL(@FCID, @ID)           
   AND BalanceFCHist.CtTrabajo = @CentroTrabajo                  
END ELSE                    
IF @PPSID IS NOT  NULL                   
BEGIN                   
 INSERT INTO #PlanSemanal (Partida, Situacion, SituacionUsuario, Estacion, Articulo, Lun, Mar, Mie, Jue, Vie, Sab, Dom, Total, Saldo, Producido, TotalPP, TotalKilos)                   
   SELECT 1,            
         ForecastPlanSemanal.Situacion,                
          ForecastPlanSemanal.SituacionUsuario,                
          NULLIF(RTRIM(ForecastPlanSemanalD.Estacion), ''),               
          ForecastPlanSemanalD.Articulo,                   
    ForecastPlanSemanalD.Lun,                   
    ForecastPlanSemanalD.Mar,                   
    ForecastPlanSemanalD.Mie,                   
    ForecastPlanSemanalD.Jue,                   
    ForecastPlanSemanalD.Vie,                   
    ForecastPlanSemanalD.Sab,                   
    ForecastPlanSemanalD.Dom,           
    ISNULL(ForecastPlanSemanalD.Total,0.00),                 
    dbo.fnForecastPlanSemanalAcum (@Ejercicio, @Periodo,  @CentroTrabajo, ForecastPlanSemanalD.Articulo, ForecastPlanSemanalD.Total),            
    dbo.fnProducidoSemanalAcumArticulo ('INCF', @CentroTrabajo, ForecastPlanSemanalD.Articulo, @FechaD, @FechaA),     
 ISNULL(ForecastPlanSemanalD.Lun,0.00) +     
 ISNULL(ForecastPlanSemanalD.Mar,0.00) +     
 ISNULL(ForecastPlanSemanalD.Mie,0.00) +     
 ISNULL(ForecastPlanSemanalD.Jue,0.00) +     
 ISNULL(ForecastPlanSemanalD.Vie,0.00) +     
 ISNULL(ForecastPlanSemanalD.Sab,0.00) +     
 ISNULL(ForecastPlanSemanalD.Dom,0.00), 
 (ISNULL(ForecastPlanSemanalD.Lun,0.00) +     
 ISNULL(ForecastPlanSemanalD.Mar,0.00) +     
 ISNULL(ForecastPlanSemanalD.Mie,0.00) +     
 ISNULL(ForecastPlanSemanalD.Jue,0.00) +     
 ISNULL(ForecastPlanSemanalD.Vie,0.00) +     
 ISNULL(ForecastPlanSemanalD.Sab,0.00) +     
 ISNULL(ForecastPlanSemanalD.Dom,0.00)) * ISNULL(Art.GramajeFC,0) 
    FROM  ForecastPlanSemanalD                  
  JOIN ForecastPlanSemanal ON ForecastPlanSemanalD.ID = ForecastPlanSemanal.ID 
  JOIN Art                 ON ForecastPlanSemanalD.Articulo = Art.Articulo   
    WHERE ForecastPlanSemanal.FCID  = ISNULL(@FCID, @ID)      
 AND ForecastPlanSemanal.ID = @PPSID      
    ORDER BY ForecastPlanSemanalD.Renglon ASC                   
END        
INSERT INTO #PlanSemanal (Partida, Lun, Mar, Mie, Jue, Vie, Sab, Dom, Total, Saldo, TotalPP, TotalKilos)                 
SELECT  2,       SUM(ISNULL(Lun,0.00)),                 
                 SUM(ISNULL(Mar,0.00)),                 
     SUM(ISNULL(Mie,0.00)),                 
     SUM(ISNULL(Jue,0.00)),                 
     SUM(ISNULL(Vie,0.00)),                
     SUM(ISNULL(Sab,0.00)),                 
     SUM(ISNULL(Dom,0.00)),                
     SUM(ISNULL(Total,0.00)),                 
     SUM(ISNULL(Saldo,0.00)),       
     SUM(ISNULL(TotalPP,0.00)), 
  SUM(ISNULL(TotalKilos,0.00))  
   FROM #PlanSemanal    
    DECLARE crForecast CURSOR FOR                       
   SELECT ISNULL(#PlanSemanal.Situacion, ''),                    
    ISNULL(#PlanSemanal.SituacionUsuario, '')                  
       FROM #PlanSemanal             
   WHERE #PlanSemanal.Articulo IS NOT NULL           
   GROUP BY                   
    ISNULL(#PlanSemanal.Situacion, ''),                    
    ISNULL(#PlanSemanal.SituacionUsuario, '')                 
    OPEN crForecast                      
    FETCH NEXT FROM crForecast INTO @Situacion,  @SituacionUsuario                  
    WHILE @@FETCH_STATUS <> -1                      
    BEGIN                      
      IF @@FETCH_STATUS <> -2                       
      BEGIN                  
      IF @PPSID IS NOT NULL             
    BEGIN             
    EXEC spSituacionPermiteAvanzarFC 'FC', 'Plan Semanal', @Situacion, @Usuario, @PermiteAvanzar OUTPUT             
    END            
 SELECT @Situacion = ISNULL(NULLIF(RTRIM(@Situacion), ''), 'En Programacion')          
         SET @JsonData += '{"Situacion":"'        + ISNULL(CAST(@Situacion AS NVARCHAR(50)),'')                           
                       + '","SituacionUsuario":"' + ISNULL(@SituacionUsuario,'')                 
                       + '","Centro":"'           + ISNULL(@CentroTrabajo,'')               
                       + '","PermiteAvanzar":"'   + ISNULL(CONVERT(varchar,@PermiteAvanzar),'')              
                       + '","SituacionID":"'      + ISNULL(CONVERT(varchar,@PPSID),'')              
                       + '","Semana":"'           + RTRIM(LTRIM(CONVERT(varchar,@Semana)))                  
                       + '","FechaD":"'           + ISNULL(dbo.fnDateTimeFmt(@FechaD, 'DD/MM/AAAA'), '')                     
                       + '","FechaA":"'           + ISNULL(dbo.fnDateTimeFmt(@FechaA, 'DD/MM/AAAA'), '')                 
                       + '","Detalle":['                 
DECLARE @SemanaJson NVARCHAR(MAX) = ''                 
    DECLARE crSemana CURSOR FOR                     
     SELECT #PlanSemanal.Estacion,                 
      #PlanSemanal.Articulo,                  
   RTRIM(LTRIM(Art.Descripcion1)),                  
   #PlanSemanal.Lun,                  
   #PlanSemanal.Mar,                
   #PlanSemanal.Mie,                 
   #PlanSemanal.Jue,                
   #PlanSemanal.Vie,                 
   #PlanSemanal.Sab,                
   #PlanSemanal.Dom,                 
   #PlanSemanal.Total,                
   #PlanSemanal.Saldo,         
   #PlanSemanal.Producido,     
   #PlanSemanal.TotalPP, 
   #PlanSemanal.TotalKilos
     FROM #PlanSemanal                   
     LEFT OUTER JOIN  Art ON #PlanSemanal.Articulo = Art.Articulo                  
    -- WHERE ISNULl(#PlanSemanal.Total,0.00) > 0                  
       ORDER BY #PlanSemanal.Partida ASC, #PlanSemanal.Articulo ASC                 
 DECLARE                 
 @Estacion   varchar(255),                   
 @Articulo   varchar(20),                  
 @Descripcion1  varchar(100),                 
 @Lun           float,                
 @Mar           float,                
 @Mie           float,                
 @Jue           float,                 
 @Vie           float,                 
 @Sab           float,                
 @Dom           float,                
 @Total         float,                 
 @Saldo         float,         
 @Producido     float,     
 @TotalPP       float, 
 @TotalKilos    float 
    OPEN crSemana                    
    FETCH NEXT FROM crSemana INTO @Estacion, @Articulo, @Descripcion1, @Lun, @Mar, @Mie, @Jue, @Vie, @Sab, @Dom, @Total, @Saldo, @Producido, @TotalPP, @TotalKilos                 
    WHILE @@FETCH_STATUS <> -1           
    BEGIN                    
      IF @@FETCH_STATUS <> -2                     
      BEGIN       
   SELECT  @Saldo = dbo.fnMayor(@Saldo,0.00)          
    SELECT @SemanaJson             += '{"Estacion":"'     + RTRIM(LTRIM(CONVERT(varchar, ISNULL(@Estacion,''))))                  
       + '","Articulo":"'         + ISNULL(RTRIM(LTRIM(@Articulo)), '')    
       + '","EstacionTrabajo":"'  + ISNULL(RTRIM(LTRIM(@Estacion)), '')    
       + '","Descripcion":"'  + ISNULL(RTRIM(LTRIM(@Descripcion1)), '')                  
       + '","Lun":'           + CONVERT(varchar, ISNULL(@Lun, ''))                  
       + ', "Mar":'           + CONVERT(varchar, ISNULL(@Mar, ''))                  
       + ', "Mie":'           + CONVERT(varchar, ISNULL(@Mie, ''))                  
       + ', "Jue":'           + CONVERT(varchar, ISNULL(@Jue, ''))                  
       + ', "Vie":'           + CONVERT(varchar, ISNULL(@Vie, ''))                  
       + ', "Sab":'           + CONVERT(varchar, ISNULL(@Sab, ''))                  
       + ', "Dom":'           + CONVERT(varchar, ISNULL(@Dom, ''))                 
       + ', "Saldo":'         + CONVERT(varchar, ISNULL(@Saldo, ''))             
       + ', "Producido":'     + CONVERT(varchar, ISNULL(@Producido, ''))      
       + ', "TotalPP":'       + CONVERT(varchar, ISNULL(@TotalPP, ''))  
    + ', "TotalKilos":'    + CONVERT(varchar, ISNULL(@TotalKilos, ''))  
       + ', "Total":'         + CONVERT(varchar, ISNULL(@Total, ''))                  
                           + ',"Estaciones":['                  
      DECLARE                     
                        @EstacionJson NVARCHAR(MAX) = ''                    
                            SELECT @EstacionJson  +='{"EstacionLista":"'    + ISNULL(CAST(EstacionTFCTemp.Estacion AS NVARCHAR(20)),'')                     
                                                  +'","DescripcionLista":"' + ISNULL(RTRIM(LTRIM(EstacionTFCTemp.Descripcion)), '')                     
                                                  +'"},'                    
                              FROM                     
                               EstacionTFCTemp                 
          WHERE                 
          EstacionTFCTemp.Centro = @CentroTrabajo               
                       SET @EstacionJson = LEFT(@EstacionJson, LEN(@EstacionJson) - 1)                  
                       SET @SemanaJson += @EstacionJson + ']},'                  
      END                    
      FETCH NEXT FROM crSemana INTO @Estacion, @Articulo, @Descripcion1, @Lun, @Mar, @Mie, @Jue, @Vie, @Sab, @Dom, @Total, @Saldo, @Producido, @TotalPP, @TotalKilos                   
    END                    
    CLOSE crSemana                    
    DEALLOCATE crSemana                 
            SET @SemanaJson = LEFT(@SemanaJson, LEN(@SemanaJson) - 1)                          
            SET @JsonData += @SemanaJson + ']},'                   
      END                      
      FETCH NEXT FROM crForecast INTO @Situacion,  @SituacionUsuario                   
    END                      
    CLOSE crForecast                      
    DEALLOCATE crForecast                   
SET @JsonData = LEFT(@JsonData, LEN(@JsonData) - 1)                           
IF NULLIF(RTRIM(@JsonData), '') IS NOT NULL SET @JsonData += ']'                    
SELECT NULLIF(RTRIM(@JsonData), '') AS json                     
RETURN                   
END  
GO

/**************** spProgramaProduccionConcentradoCentro ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProduccionConcentradoCentro') and type = 'P') DROP PROCEDURE dbo.spProgramaProduccionConcentradoCentro
GO
CREATE PROCEDURE [dbo].[spProgramaProduccionConcentradoCentro] 
     @Usuario VARCHAR(10)
 ,@Ejercicio INT
 ,@Periodo INT
 ,@Semana INT
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spProgramaProduccionConcentradoCentro'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') + 
             ', @Ejercicio: ' + ISNULL(CAST(@Ejercicio AS VARCHAR), 'NULL') + 
             ', @Periodo: '   + ISNULL(CAST(@Periodo   AS VARCHAR), 'NULL') + 
             ', @Semana: '    + ISNULL(CAST(@Semana    AS VARCHAR), 'NULL') 
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     SELECT 
             ForecastPlanProduccion.ID
      ,ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.CentroTrabajo
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00)) AS PzasProducir
     FROM ForecastPlanProduccion
     WHERE 
            ForecastPlanProduccion.Ejercicio = @Ejercicio
  AND ForecastPlanProduccion.Periodo = @Periodo
  AND ForecastPlanProduccion.Semana = @Semana
     GROUP BY 
            ForecastPlanProduccion.ID
      ,ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.CentroTrabajo
     RETURN
    END
GO

/**************** spWebSigmaEjecucion ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebSigmaEjecucion') and type = 'P') DROP PROCEDURE dbo.spWebSigmaEjecucion
GO
CREATE PROCEDURE spWebSigmaEjecucion 
                   @SQL varchar(max) 
AS BEGIN
       EXEC (@SQL) 
RETURN 
END 
GO

/**************** spWebExplocionCapacidad ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebExplocionCapacidad') and type = 'P') DROP PROCEDURE dbo.spWebExplocionCapacidad
GO
CREATE PROCEDURE spWebExplocionCapacidad  
                        @Usuario  varchar(10) 
AS BEGIN 
DECLARE
 @ID                   int, 
 @Articulo             varchar(20),  
 @Producir             float, 
 @CapacidadProduccion  float
    DECLARE crExplocion CURSOR FOR     
     SELECT ExplocionMatCF.ID, 
         ExplocionMatCF.ArticuloPadre, 
   ExplocionMatCF.Producir 
    FROM ExplocionMatCF 
   WHERE ExplocionMatCF.Bandera  = 1 
    AND  ExplocionMatCF.Usuario = @Usuario
  ORDER BY  Articulo
    OPEN crExplocion    
    FETCH NEXT FROM crExplocion INTO @ID, @Articulo, @Producir
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN  
      SELECT @CapacidadProduccion = NULL 
     SELECT @CapacidadProduccion = MIN(dbo.fnWebExplocionCapacidad(@Producir, InvH, InvRequerido))  FROM ExplocionMatCF WHERE Usuario = 'MASERP' AND ArticuloPadre = @Articulo AND Bandera  IS NULL AND SeProduce = 0
        UPDATE ExplocionMatCF SET ExplocionMatCF.CapacidadProduccion = @CapacidadProduccion WHERE ExplocionMatCF.ID = @ID
      END    
      FETCH NEXT FROM crExplocion INTO @ID, @Articulo, @Producir   
    END    
    CLOSE crExplocion    
    DEALLOCATE crExplocion 
RETURN 
END 
GO

/**************** spProgramaProduccionConcentradoFamilia ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProduccionConcentradoFamilia') and type = 'P') DROP PROCEDURE dbo.spProgramaProduccionConcentradoFamilia
GO
CREATE PROCEDURE [dbo].[spProgramaProduccionConcentradoFamilia] 
     @Usuario VARCHAR(10)
 ,@Ejercicio INT
 ,@Periodo INT
 ,@Semana INT
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spProgramaProduccionConcentradoFamilia'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') + 
             ', @Ejercicio: ' + ISNULL(CAST(@Ejercicio AS VARCHAR), 'NULL') + 
             ', @Periodo: '   + ISNULL(CAST(@Periodo   AS VARCHAR), 'NULL') + 
             ', @Semana: '    + ISNULL(CAST(@Semana    AS VARCHAR), 'NULL') 
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     DECLARE @TABLE TABLE 
            (Orden INT
      ,Ejercicio INT
      ,Periodo INT
      ,Semana INT
      ,CentroTrabajo VARCHAR(20)
      ,Familia VARCHAR(50)
      ,PzasProducir FLOAT
      ,Kilos FLOAT
      )
     DELETE @TABLE
     INSERT INTO @TABLE (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,CentroTrabajo
      ,Familia
      ,PzasProducir
      ,Kilos
      )
     SELECT 1
      ,ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.Semana
      ,ForecastPlanProduccion.CentroTrabajo
      ,ForecastPlanProduccion.Familia
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.Kilos, 0.00))
     FROM ForecastPlanProduccion
     WHERE ForecastPlanProduccion.Ejercicio = @Ejercicio
      AND ForecastPlanProduccion.Periodo = @Periodo
      AND ForecastPlanProduccion.Semana = @Semana
     GROUP BY ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.CentroTrabajo
      ,ForecastPlanProduccion.Familia
      ,ForecastPlanProduccion.Semana
     HAVING SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00)) > 0.00
     ORDER BY ForecastPlanProduccion.CentroTrabajo
     INSERT INTO @TABLE (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,CentroTrabajo
      ,Familia
      ,PzasProducir
      ,Kilos
      )
     SELECT 2
      ,tbl.Ejercicio
      ,tbl.Periodo
      ,tbl.Semana
      ,NULL
      ,'Totales'
      ,SUM(ISNULL(tbl.PzasProducir, 0.00))
      ,SUM(ISNULL(tbl.Kilos, 0.00))
     FROM @TABLE tbl
     GROUP BY tbl.Ejercicio
      ,tbl.Periodo
      ,tbl.Semana
     SELECT tbl.Orden
      ,tbl.Ejercicio
      ,tbl.Periodo
      ,tbl.Semana
      ,tbl.CentroTrabajo
      ,tbl.Familia
      ,tbl.PzasProducir
      ,tbl.Kilos
     FROM @TABLE tbl
     ORDER BY tbl.Orden ASC
      ,tbl.Familia ASC
     RETURN
    END
GO

/**************** spProgramaProdConcentadoDashboardCentro ****************/
if exists (select * from sysobjects where id = object_id('dbo.spProgramaProdConcentadoDashboardCentro') and type = 'P') DROP PROCEDURE dbo.spProgramaProdConcentadoDashboardCentro
GO
CREATE PROCEDURE [dbo].[spProgramaProdConcentadoDashboardCentro] 
     @Usuario VARCHAR(10)
 ,@Ejercicio INT
 ,@Periodo INT
 ,@Semana INT
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spProgramaProdConcentadoDashboardCentro'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') + 
             ', @Ejercicio: ' + ISNULL(CAST(@Ejercicio AS VARCHAR), 'NULL') + 
             ', @Periodo: '   + ISNULL(CAST(@Periodo   AS VARCHAR), 'NULL') + 
             ', @Semana: '    + ISNULL(CAST(@Semana    AS VARCHAR), 'NULL') 
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     DECLARE 
             @Modulo CHAR(5) = 'FC'
      ,@Mov VARCHAR(20) = 'Plan Semanal'
      ,@Empresa CHAR(5) = 'INCF'
      ,@FechaD DATETIME
      ,@FechaA DATETIME
      ,@Situacion VARCHAR(50)
      ,@PermiteAvanzar BIT
      ,@SituacionPasos INT
     CREATE TABLE #ConcentadoDashboard 
            (Orden INT NULL
      ,Ejercicio INT NULL
      ,Periodo INT NULL
      ,Semana INT NULL
      ,Situacion VARCHAR(50) COLLATE Database_Default NULL
      ,Centro VARCHAR(10) COLLATE Database_Default NULL
      ,ALun FLOAT NULL
      ,ALunP FLOAT NULL
      ,BMar FLOAT NULL
      ,BMarP FLOAT NULL
      ,CMie FLOAT NULL
      ,CMieP FLOAT NULL
      ,DJue FLOAT NULL
      ,DJueP FLOAT NULL
      ,EVie FLOAT NULL
      ,EVieP FLOAT NULL
      ,FSab FLOAT NULL
      ,FSabP FLOAT NULL
      ,Total FLOAT NULL
      ,TotalKilos FLOAT NULL
      ,Producido FLOAT NULL
      ,ProducidoKgs FLOAT NULL)
     DELETE #ConcentadoDashboard
     SELECT @FechaD = DIM_TIEMPO_SEMANA.FECHAINICIO
      ,@FechaA = DIM_TIEMPO_SEMANA.FECHAFIN
     FROM DIM_TIEMPO_SEMANA
     WHERE DIM_TIEMPO_SEMANA.AÑO = @Ejercicio
      AND DIM_TIEMPO_SEMANA.MES = @Periodo
      AND DIM_TIEMPO_SEMANA.SEMANA = @Semana
     SELECT @SituacionPasos = COUNT(*)
     FROM MovSituacionFC
     WHERE MovSituacionFC.Mov = @Mov
      AND MovSituacionFC.Modulo = @Modulo
     INSERT INTO #ConcentadoDashboard (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,Situacion
      ,Centro
      ,ALun
      ,ALunP
      ,BMar
      ,BMarP
      ,CMie
      ,CMieP
      ,DJue
      ,DJueP
      ,EVie
      ,EVieP
      ,FSab
      ,FSabP
      ,Total
      ,TotalKilos
      ,Producido
      ,ProducidoKgs
      )
     SELECT 1
      ,ISNULL(@Ejercicio, ForecastPlanProduccion.Ejercicio)
      ,ISNULL(@Periodo, ForecastPlanProduccion.Periodo)
      ,ISNULL(@Semana, ForecastPlanProduccion.Semana)
      ,ForecastPlanProduccion.Situacion
      ,CentroFC.Centro
      ,SUM(ISNULL(ForecastPlanProduccion.Lun, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, @FechaD, @FechaD))
      ,SUM(ISNULL(ForecastPlanProduccion.Mar, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, DATEADD(day, 1, @FechaD), DATEADD(day, 1, @FechaD)))
      ,SUM(ISNULL(ForecastPlanProduccion.Mie, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, DATEADD(day, 2, @FechaD), DATEADD(day, 2, @FechaD)))
      ,SUM(ISNULL(ForecastPlanProduccion.Jue, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, DATEADD(day, 3, @FechaD), DATEADD(day, 3, @FechaD)))
      ,SUM(ISNULL(ForecastPlanProduccion.Vie, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, DATEADD(day, 4, @FechaD), DATEADD(day, 4, @FechaD)))
      ,SUM(ISNULL(ForecastPlanProduccion.Sab, 0.00))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, DATEADD(day, 5, @FechaD), DATEADD(day, 5, @FechaD)))
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00))
      ,SUM(ISNULL(ForecastPlanProduccion.PorProducir, 0.00) * ISNULL(Art.GramajeFC, 1))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, @FechaD, @FechaA))
      ,SUM(dbo.fnWebProducidoFechasAcumArticulo(@Empresa, CentroFC.Centro, ForecastPlanProduccion.Articulo, @FechaD, @FechaA) * ISNULL(Art.GramajeFC, 0.00))
     FROM CentroFC
     LEFT JOIN ForecastPlanProduccion
      ON CentroFC.Centro = ForecastPlanProduccion.CentroTrabajo
       AND ForecastPlanProduccion.Ejercicio = @Ejercicio
       AND ForecastPlanProduccion.Periodo = @Periodo
       AND ForecastPlanProduccion.Semana = @Semana
     LEFT JOIN Art
      ON ForecastPlanProduccion.Articulo = Art.Articulo
     WHERE CentroFC.Forecast = 1
     GROUP BY ForecastPlanProduccion.Ejercicio
      ,ForecastPlanProduccion.Periodo
      ,ForecastPlanProduccion.Semana
      ,CentroFC.Centro
      ,ForecastPlanProduccion.Situacion
     INSERT INTO #ConcentadoDashboard (
      Orden
      ,Ejercicio
      ,Periodo
      ,Semana
      ,Centro
      ,Situacion
      ,ALun
      ,ALunP
      ,BMar
      ,BMarP
      ,CMie
      ,CMieP
      ,DJue
      ,DJueP
      ,EVie
      ,EVieP
      ,FSab
      ,FSabP
      ,Total
      ,TotalKilos
      ,Producido
      ,ProducidoKgs
      )
     SELECT 2
      ,#ConcentadoDashboard.Ejercicio
      ,#ConcentadoDashboard.Periodo
      ,#ConcentadoDashboard.Semana
      ,'Total'
      ,''
      ,SUM(ISNULL(#ConcentadoDashboard.ALun, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.ALunP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.BMar, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.BMarP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.CMie, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.CMieP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.DJue, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.DJueP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.EVie, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.EVieP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.FSab, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.FSabP, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.Total, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.TotalKilos, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.Producido, 0.00))
      ,SUM(ISNULL(#ConcentadoDashboard.ProducidoKgs, 0.00))
     FROM #ConcentadoDashboard
     GROUP BY #ConcentadoDashboard.Ejercicio
      ,#ConcentadoDashboard.Periodo
      ,#ConcentadoDashboard.Semana
     SELECT #ConcentadoDashboard.Orden
      ,ISNULL(#ConcentadoDashboard.Situacion, '') AS Situacion
      ,@SituacionPasos AS SituacionPasos
      ,ISNULL(MovSituacionFC.Orden, 0) AS SituacionPaso
      ,dbo.fnSituacionSiguientePermiteAvanzar(@Modulo, @Mov, #ConcentadoDashboard.Situacion, @Usuario) AS PermiteAvanzar
      ,#ConcentadoDashboard.Ejercicio
      ,#ConcentadoDashboard.Periodo
      ,#ConcentadoDashboard.Semana
      ,#ConcentadoDashboard.Centro
      ,ISNULL(#ConcentadoDashboard.ALun, 0.00) AS ALun
      ,ISNULL(#ConcentadoDashboard.ALunP, 0.00) AS ALunP
      ,ISNULL(#ConcentadoDashboard.BMar, 0.00) AS BMar
      ,ISNULL(#ConcentadoDashboard.BMarP, 0.00) AS BMarP
      ,ISNULL(#ConcentadoDashboard.CMie, 0.00) AS CMie
      ,ISNULL(#ConcentadoDashboard.CMieP, 0.00) AS CMieP
      ,ISNULL(#ConcentadoDashboard.DJue, 0.00) AS DJue
      ,ISNULL(#ConcentadoDashboard.DJueP, 0.00) AS DJueP
      ,ISNULL(#ConcentadoDashboard.EVie, 0.00) AS EVie
      ,ISNULL(#ConcentadoDashboard.EVieP, 0.00) AS EVieP
      ,ISNULL(#ConcentadoDashboard.FSab, 0.00) AS FSab
      ,ISNULL(#ConcentadoDashboard.FSabP, 0.00) AS FSabP
      ,ISNULL(#ConcentadoDashboard.Total, 0.00) AS Total
      ,ISNULL(#ConcentadoDashboard.TotalKilos, 0.00) AS TotalKilos
      ,ISNULL(#ConcentadoDashboard.Producido, 0.00) AS Producido
      ,ISNULL(#ConcentadoDashboard.ProducidoKgs, 0.00) AS ProducidoKgs
     FROM #ConcentadoDashboard
     LEFT JOIN MovSituacionFC
      ON ISNULL(#ConcentadoDashboard.Situacion, '') = MovSituacionFC.Situacion
       AND MovSituacionFC.Modulo = @Modulo
       AND MovSituacionFC.Mov = @Mov
     ORDER BY #ConcentadoDashboard.Orden ASC
      ,#ConcentadoDashboard.Centro
     RETURN
    END
GO

/**************** spWebInicioPay ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebInicioPay') and type = 'P') DROP PROCEDURE dbo.spWebInicioPay
GO
CREATE PROCEDURE [dbo].[spWebInicioPay] @Usuario VARCHAR(10)
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spWebInicioPay'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL')
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     SELECT 
            ROUND(dbo.fnPorcentajeImporte(SUM(ISNULL(WebInicio.Capacidadhrs, 0.00)), SUM(ISNULL(WebInicio.HorasProgram, 0.00))), 0) AS Utilizacion
      ,100 - ROUND(dbo.fnPorcentajeImporte(SUM(ISNULL(WebInicio.Capacidadhrs, 0.00)), SUM(ISNULL(WebInicio.HorasProgram, 0.00))), 0) AS Disponible
     FROM WebInicio
     LEFT JOIN CentroFC ON WebInicio.CentroTrabajo = CentroFC.Centro
     WHERE 
            CentroFC.Grupo = 'CAMPO FRESCO'
  AND WebInicio.Usuario = @Usuario
  AND CentroFC.Forecast = 1
     RETURN
    END
GO

/**************** spWebInicioVentaPay ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebInicioVentaPay') and type = 'P') DROP PROCEDURE dbo.spWebInicioVentaPay
GO
CREATE PROCEDURE [dbo].[spWebInicioVentaPay] @Usuario VARCHAR(10)
AS
    BEGIN
        --<MGOMEZ/2025.06.20/LOG USO| INICIO>
        INSERT INTO DBO.UT_LOG_EJC_PRO_MRP(ORG,PRM) 
        VALUES
            ('spWebInicioVentaPay'
            ,'@Usuario: '     + ISNULL(@Usuario, 'NULL') 
             );
        --<MGOMEZ/2025.06.20/LOG USO| FIN>
     CREATE TABLE #VentaPay 
            (Orden INT NULL
      ,Grupo VARCHAR(50) COLLATE Database_Default NULL
      ,Venta FLOAT NULL)
     INSERT INTO #VentaPay 
            (Orden
      ,Grupo
      ,Venta)
     SELECT 
             1
      ,CentroFC.Grupo AS Grupo
      ,SUM(ISNULL(WebInicio.Venta, 0.00)) AS Venta
     FROM WebInicio
     INNER JOIN CentroFC
     ON  WebInicio.CentroTrabajo = CentroFC.Centro
     AND WebInicio.Usuario = @Usuario
     AND CentroFC.Forecast = 1
     AND CentroFC.Grupo IS NOT NULL
     GROUP BY CentroFC.Grupo
     INSERT INTO #VentaPay 
            (Orden
      ,Grupo
      ,Venta)
     SELECT 
            2
      ,'TOTAL'
      ,SUM(ISNULL(Venta, 0.00))
     FROM #VentaPay
     SELECT 
             #VentaPay.Orden
      ,#VentaPay.Grupo
      ,#VentaPay.Venta
     FROM #VentaPay
     ORDER BY Orden ASC
     RETURN
    END
GO

/**************** spWebInicioConcentradoExcel ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebInicioConcentradoExcel') and type = 'P') DROP PROCEDURE dbo.spWebInicioConcentradoExcel
GO
CREATE   PROCEDURE SPWEBINICIOCONCENTRADOEXCEL 
     @P_USR VARCHAR(10)
 ,@P_EJR INT
 ,@P_PRD INT
AS
    BEGIN
        --:::::[ CONFIGURACION ]
        SET NOCOUNT     ON;
        SET DATEFORMAT  DMY;
        SET DATEFIRST   1;
        --:::::[ PRUEBAS | VARIABLES ]
        --DECLARE
        --     @P_USR       VARCHAR(10)
     -- ,@P_EJR     INT
     -- ,@P_PRD       INT
        --:::::[ PRUEBAS | VALORES ]
        --SELECT 
        --   @P_USR   = 'RPT'
     --  ,@P_EJR = 2025
     --  ,@P_PRD   = 2
        --:::::[ TEMPORAL | ELIMINAR ]
        IF (OBJECT_ID('TEMPDB..#_CONCENTRADO_FAMILIA') IS NOT NULL) DROP TABLE #_CONCENTRADO_FAMILIA;
        --:::::[ TEMPORAL | DEFINICION ]
     CREATE TABLE #_CONCENTRADO_FAMILIA
            (ID                 INT NOT NULL IDENTITY(1, 1)
            ,EJR                INT
            ,PRD                INT
      ,FAMILIA            VARCHAR(50) COLLATE DATABASE_DEFAULT NULL
      ,PZAPRODUCIRSE      FLOAT NULL
      ,KILOGRAMOSDEUSO    FLOAT NULL)
        --:::::[  ]
     EXEC SPARTCENTRODEFAUL 
                 @P_USR
          ,@P_EJR
        --:::::[  ]
     EXEC SPFCASIGNARBASESDEFAUL @P_USR
        --:::::[  ]
     EXEC SPFCFORCASTCFNUK 
                 @P_USR
          ,@P_EJR
          ,@P_PRD
          ,1
        --:::::[ OBTENER | CONCENTRADO X FAMILIA ]
     INSERT INTO #_CONCENTRADO_FAMILIA 
            (EJR
            ,PRD
            ,FAMILIA
      ,PZAPRODUCIRSE
      ,KILOGRAMOSDEUSO)
         SELECT 
                 @P_EJR
                ,@P_PRD
                ,RESUMENPLANEACIONCF.FAMILIACF AS FAMILIA
          ,SUM(ISNULL(RESUMENPLANEACIONCF.PRODUCIR, 0.00))
          ,SUM(ISNULL(RESUMENPLANEACIONCF.KG, 0.00))
         FROM RESUMENPLANEACIONCF
         WHERE RESUMENPLANEACIONCF.USUARIO = @P_USR
         GROUP BY RESUMENPLANEACIONCF.FAMILIACF
         HAVING SUM(ISNULL(PRODUCIR, 0.00)) > 0.00
         ORDER BY RESUMENPLANEACIONCF.FAMILIACF ASC
        --:::::[ OBTENER | TOTAL CONCENTRADO X FAMILIA ]
        INSERT INTO #_CONCENTRADO_FAMILIA 
            (EJR
            ,PRD
            ,FAMILIA
            ,PZAPRODUCIRSE
            ,KILOGRAMOSDEUSO)
            SELECT 
                 @P_EJR
                ,@P_PRD
                ,'TOTAL'
                ,ROUND(SUM(ISNULL(#_CONCENTRADO_FAMILIA.PZAPRODUCIRSE, 0.00)), 0)
                ,ROUND(SUM(ISNULL(#_CONCENTRADO_FAMILIA.KILOGRAMOSDEUSO, 0.00)), 0)
            FROM #_CONCENTRADO_FAMILIA
        --:::::[ RESULTADO ]
     SELECT 
             EJR
            ,PRD
            ,UPPER(FAMILIA)     AS FAMILIA
      ,PZAPRODUCIRSE      AS PRODUCIR_PZA
      ,KILOGRAMOSDEUSO    AS USO_KG
     FROM #_CONCENTRADO_FAMILIA
     ORDER BY FAMILIA;
        --:::::[ FIN ]
     RETURN 0;
    END
GO

/**************** spWebArriboDispFamIntegracion ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArriboDispFamIntegracion') and type = 'P') DROP PROCEDURE dbo.spWebArriboDispFamIntegracion
GO
CREATE PROCEDURE spWebArriboDispFamIntegracion               
                           @Usuario      varchar(10), 
         @Familia      varchar(50)
AS BEGIN 
DECLARE 
@Empresa char(5) = 'INCF'
 DECLARE @TABLE AS TABLE (Almacen     varchar(20),
                          Nombre      varchar(100),
                             Disponible  float)  
 
INSERT INTO @TABLE(Almacen, Nombre, Disponible) 
  SELECT  ArtDisponible.Almacen, Alm.Nombre,  SUM(ISNULL(ArtDisponible.Disponible,0.00))               
     FROM ArtDisponible    
     JOIN Art ON ArtDisponible.Articulo = Art.Articulo  
     JOIN Alm ON ArtDisponible.Almacen  = Alm.Almacen 
   WHERE ArtDisponible.Empresa = @Empresa            
   AND Art.FamArtCF = @Familia              
    AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)   
    AND Art.ArribosFC = 1  
    AND Art.GranelFC = 0  
 GROUP BY ArtDisponible.Almacen, Alm.Nombre
 INSERT INTO @TABLE(Almacen, Nombre, Disponible)  
     SELECT  ArtDisponible.Almacen, Alm.Nombre,  SUM(ISNULL(ArtDisponible.Disponible,0.00))               
     FROM ArtDisponible    
      JOIN Art ON ArtDisponible.Articulo = Art.Articulo   
      JOIN Alm ON ArtDisponible.Almacen  = Alm.Almacen 
   WHERE ArtDisponible.Empresa = @Empresa           
   AND Art.FamArtCF =  @Familia                         
    AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.GranelCF = 1)   
   AND Art.ArribosFC = 1  
   AND Art.GranelFC = 1 
  GROUP BY ArtDisponible.Almacen, Alm.Nombre
 SELECT Existencia.Almacen, 
        Existencia.Nombre, 
        ROUND(SUM(ISNULL(Existencia.Disponible,0.00)),0) AS Disponible
  FROM @TABLE AS Existencia
  GROUP BY 
    Existencia.Almacen, 
    Existencia.Nombre 
  HAVING ROUND(SUM(ISNULL(Existencia.Disponible,0.00)),0) > 0.00
RETURN 
END 
GO

/**************** spWebArriboDispInsumoIntegracion ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArriboDispInsumoIntegracion') and type = 'P') DROP PROCEDURE dbo.spWebArriboDispInsumoIntegracion
GO
CREATE PROCEDURE spWebArriboDispInsumoIntegracion 
                           @Usuario      varchar(10), 
                           @Articulo     varchar(20)
AS BEGIN 
DECLARE 
@Empresa char(5) = 'INCF'
SELECT                
      ARTDISPONIBLEVACA.ALMACEN,   
   Alm.Nombre, 
       ROUND(SUM(ISNULL(ARTDISPONIBLEVACA.Disponible,0.00)),0)  AS Disponible                   
   FROM Arribos12S          
   LEFT OUTER JOIN  ARTDISPONIBLEVACA ON Arribos12S.Articulo = ARTDISPONIBLEVACA.Articulo           
          AND ARTDISPONIBLEVACA.Empresa = @Empresa       
          AND ARTDISPONIBLEVACA.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)   
 JOIN  Alm ON ARTDISPONIBLEVACA.Almacen = Alm.Almacen 
WHERE Arribos12S.Usuario  = @Usuario  
  AND Arribos12S.Articulo = @Articulo
  GROUP BY ARTDISPONIBLEVACA.ALMACEN, 
           Alm.Nombre
  HAVING  ROUND(SUM(ISNULL(ARTDISPONIBLEVACA.Disponible,0.00)),0) > 0.00
RETURN 
END 
GO

/**************** spWebArriboDispBBCIntegracion ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebArriboDispBBCIntegracion') and type = 'P') DROP PROCEDURE dbo.spWebArriboDispBBCIntegracion
GO
CREATE PROCEDURE spWebArriboDispBBCIntegracion   
                           @Usuario      varchar(10),   
                           @Articulo     varchar(20)  
AS BEGIN   
DECLARE   
@Empresa char(5) = 'INCF'            
  SELECT 
         ArtDisponible.Almacen,     
         Alm.Nombre,   
         ROUND(SUM(ISNULL(ArtDisponible.Disponible,0.00)),0) AS Disponible              
     FROM ArtDisponible    
   JOIN  Alm ON ArtDisponible.Almacen = Alm.Almacen  
   WHERE ArtDisponible.Empresa=@Empresa            
   AND ArtDisponible.Articulo = @Articulo                
   AND ArtDisponible.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)  
   GROUP BY 
            ArtDisponible.Almacen,     
         Alm.Nombre
   HAVING SUM(ISNULL(ArtDisponible.Disponible,0.00)) > 0.00
RETURN   
END
GO

/**************** spFCArribosVacaPendientes ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCArribosVacaPendientes') and type = 'P') DROP PROCEDURE dbo.spFCArribosVacaPendientes
GO
CREATE PROCEDURE spFCArribosVacaPendientes                     @Usuario      varchar(10)     AS BEGIN  DECLARE    @FechaD       datetime,    @FechaA       datetime          SELECT @FechaA = dbo.fnFechaSinHora(GETDATE()) ,           @FechaD = DATEADD(MONTH, -3, @FechaA)       ----SELECT @FechaD, @FechaA         DECLARE @Arribos TABLE
  (Empresa         char(5),     FechaEmision    datetime,     Mov             varchar(20),     MovID           varchar(20),     Rama            varchar(20),     Articulo        varchar(20),     Fecha           datetime,     Cantidad        float,    CantidadNeta    float,     Contenedor      varchar(255),     Proveedor       varchar(10),     ProvNombre      varchar(100),     ArtDesc         varchar(100),     AduanaEntrada  varchar(255),     TipoEnvio      varchar(50),     TipoContenedor varchar(50),     BL             varchar(100))                      INSERT INTO @Arribos (Empresa, FechaEmision, Mov, MovID, Rama, Articulo, Fecha, Cantidad,Contenedor, AduanaEntrada, TipoEnvio, TipoContenedor, BL, Proveedor, ProvNombre, ArtDesc, CantidadNeta)            SELECT C.Empresa, 
      C.FechaEmision, 
      C.Mov, 
      C.MovID, 
      A.Rama, 
               CD.Articulo,  
               CD.FechaEntrega,   
            CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END, 
      C.Contenedor,
      C.AduanaEntrada, 
      C.TipoEnvio, 
      C.TipoContenedor, 
      C.BL, 
      C.Proveedor,
      Prov.Nombre, 
      A.Descripcion1, 
      ISNULL(CD.Cantidad,0.00) - ISNULL(CD.CantidadCancelada,0.0)
        FROM 
             [192.168.1.11].INTELISIS5000.DBO.COMPRA  AS C   WITH (NOLOCK)  
              JOIN [192.168.1.11].INTELISIS5000.DBO.COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID  
     JOIN [192.168.1.11].INTELISIS5000.DBO.Prov           WITH (NOLOCK) ON C.Proveedor = Prov.Proveedor  
     JOIN [192.168.1.11].INTELISIS5000.DBO.Art      AS A  WITH (NOLOCK) ON CD.Articulo = A.Articulo  
        WHERE  
            (C.EMPRESA IN ('VACA', 'PDB'))  
        AND (C.ESTATUS IN ('PENDIENTE'))  
        AND (C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS'))  
        --AND (C.MONEDA  = 'DOLARES')  
        AND (CD.FECHAENTREGA BETWEEN @FechaD AND @FechaA)
     AND YEAR(C.FechaEmision) > 2023  
        AND CD.CANTIDADPENDIENTE> 0.00  
  AND A.Estatus = 'ALTA'
  AND   NULLIF(RTRIM(A.CategoriaActivoFijo), '') IS NULL
     --AND A.Rama  NOT IN ('INSUMOS')
    --AND (CD.Articulo LIKE 'A%' OR  CD.Articulo LIKE 'S%' OR  CD.Articulo LIKE 'DH%')
    AND (CD.Articulo LIKE 'A%')
    
 INSERT INTO @Arribos (Empresa,  FechaEmision, Mov, MovID, Rama, Articulo, Fecha, Cantidad, Contenedor, AduanaEntrada, TipoEnvio, TipoContenedor, BL, Proveedor, ProvNombre, ArtDesc, CantidadNeta)            SELECT 
    C.Empresa, 
    C.FechaEmision, 
    C.Mov, 
    C.MovID, 
    A.Rama, 
             CD.Articulo,  
             CD.FechaEntrega,   
          CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END, 
    C.Contenedor,
    C.AduanaEntrada, 
   C.TipoEnvio, 
   C.TipoContenedor, 
   C.BL, 
    C.Proveedor,
    Prov.Nombre, 
    A.Descripcion1, 
    ISNULL(CD.Cantidad,0.00) - ISNULL(CD.CantidadCancelada,0.0)
        FROM 
             DBO.COMPRA            AS C   WITH (NOLOCK)  
              JOIN DBO.COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID 
     JOIN DBO.Prov           WITH (NOLOCK) ON C.Proveedor = Prov.Proveedor  
     JOIN DBO.Art     AS  A  WITH (NOLOCK) ON CD.Articulo = A.Articulo  
        WHERE  
            (C.EMPRESA = 'INCF')  
        AND (C.ESTATUS IN ('PENDIENTE'))  
        AND (C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS'))  
        AND (CD.FECHAENTREGA BETWEEN @FechaD AND @FechaA)  
  AND YEAR(C.FechaEmision) > 2023  
        AND CD.CANTIDADPENDIENTE> 0.00  
  AND A.Estatus = 'ALTA'
  AND   NULLIF(RTRIM(A.CategoriaActivoFijo), '') IS NULL 
  --AND A.Rama  NOT IN ('INSUMOS')
 -- AND (CD.Articulo LIKE 'A%' OR  CD.Articulo LIKE 'S%' OR  CD.Articulo LIKE 'DH%')
  AND (CD.Articulo LIKE 'A%')
 SELECT a.Empresa, 
        a.FechaEmision, 
  a.Mov, 
  a.MovID, 
  a.Proveedor, 
  a.ProvNombre, 
  ISNULL(a.Contenedor,'') AS ContenedorCompra, 
  ISNULL(a.AduanaEntrada,'') AS AduanaEntrada, 
  ISNULL(a.TipoEnvio,'') AS TipoEnvio, 
  ISNULL(a.TipoContenedor,'') AS TipoContenedor, 
  ISNULL(a.BL,'') AS BL, 
  a.Fecha AS FechaEntrega, 
  ISNULL(a.Rama,'') AS Rama, 
  a.Articulo, 
  a.ArtDesc, 
  a.CantidadNeta AS Cantidad, 
  a.Cantidad AS CantidadPendiente 
  FROM @Arribos AS a 
  ORDER BY a.Empresa, a.FechaEmision ASC, a.MovID ASC 
RETURN 
END
GO

/**************** spWebCoberturaBBC ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebCoberturaBBC') and type = 'P') DROP PROCEDURE dbo.spWebCoberturaBBC
GO
CREATE PROCEDURE spWebCoberturaBBC                     @Usuario      varchar(10)
AS BEGIN 
DECLARE
    @ID              int, 
    @Familia         varchar(50), 
    @Empresa         char(5) = 'INCF', 
 @Inventario      float, 
 @S1              float,
 @S2              float,
 @S3              float,
 @S4              float,
 @S5              float,
 @S6              float, 
 @S7              float,
 @S8              float,
 @S9              float,
 @S10             float,
 @S11             float,
 @S12             float, 
 
    @A1              float, 
 @A2              float, 
 @A3              float, 
 @A4              float, 
 @A5              float, 
 @A6              float, 
 @A7              float, 
 @A8              float, 
 @A9              float, 
 @A10             float, 
 @A11             float, 
 @A12             float, 
 @AP1             float, 
 @AP2             float, 
 @AP3             float, 
 @AP4             float, 
 @AP5             float, 
 @AP6             float, 
 @AP7             float,
 @AP8             float, 
 @AP9             float, 
 @AP10            float, 
 @AP11            float, 
 @AP12            float, 
    @IF1             float, 
 @IF2             float, 
 @IF3             float, 
 @IF4             float, 
 @IF5             float, 
 @IF6             float, 
 @IF7             float, 
 @IF8             float, 
 @IF9             float, 
 @IF10            float, 
 @IF11            float, 
 @IF12            float, 
    @SG1             float, 
 @SG2             float, 
 @SG3             float, 
 @SG4             float, 
 @SG5             float, 
 @SG6             float, 
 @SG7             float, 
 @SG8             float, 
 @SG9             float, 
 @SG10            float, 
 @SG11            float, 
 @SG12            float, 
    @II1             float, 
 @II2             float, 
 @II3             float, 
 @II4             float, 
 @II5             float, 
 @II6             float, 
 @II7             float, 
 @II8             float, 
 @II9             float, 
 @II10            float, 
 @II11            float, 
 @II12            float,
 @TiempoEntrega   float, 
 @StockMinimo     float, 
 @StockMaximo     float, 
 @FechaEmision    datetime = dbo.fnFechaSinHora(GETDATE()), 
 @Semana          int
 
EXEC spWebForecastBBC12 @Usuario, @FechaEmision
CREATE TABLE #Consumo (    
        ID                       int,  
  Articulo                 varchar(20)  COLLATE Database_Default NULL,   
  Familia                  varchar(50)  COLLATE Database_Default NULL,   
     Descripcion              varchar(100) COLLATE Database_Default NULL,
  S1                       float NULL,
  S2                       float NULL, 
  S3                       float NULL,
  S4                       float NULL, 
  S5                       float NULL, 
  S6                       float NULL,
  S7                       float NULL, 
  S8                       float NULL,
  S9                       float NULL, 
  S10                      float NULL,
  S11                      float NULL,    S12                      float NULL)     DELETE #Consumo     DECLARE crConsumo CURSOR FOR     
      SELECT        ForecastBBC12.Articulo,       dbo.fnWebArtMaterialDisponible (@Empresa, ForecastBBC12.Articulo),     SUM(ISNULL(ForecastBBC12.S1,0.00)),    SUM(ISNULL(ForecastBBC12.S2,0.00)),    SUM(ISNULL(ForecastBBC12.S3,0.00)),    SUM(ISNULL(ForecastBBC12.S4,0.00)),    SUM(ISNULL(ForecastBBC12.S5,0.00)),    SUM(ISNULL(ForecastBBC12.S6,0.00)),     SUM(ISNULL(ForecastBBC12.S7,0.00)),    SUM(ISNULL(ForecastBBC12.S8,0.00)),    SUM(ISNULL(ForecastBBC12.S9,0.00)),    SUM(ISNULL(ForecastBBC12.S10,0.00)),    SUM(ISNULL(ForecastBBC12.S11,0.00)),    SUM(ISNULL(ForecastBBC12.S12,0.00)),    
  SUM(ISNULL(ForecastBBC12.A1,0.00)), 
  SUM(ISNULL(ForecastBBC12.A2,0.00)), 
  SUM(ISNULL(ForecastBBC12.A3,0.00)), 
  SUM(ISNULL(ForecastBBC12.A4,0.00)), 
  SUM(ISNULL(ForecastBBC12.A5,0.00)), 
  SUM(ISNULL(ForecastBBC12.A6,0.00)),
  SUM(ISNULL(ForecastBBC12.A7,0.00)), 
  SUM(ISNULL(ForecastBBC12.A8,0.00)), 
  SUM(ISNULL(ForecastBBC12.A9,0.00)), 
  SUM(ISNULL(ForecastBBC12.A10,0.00)), 
  SUM(ISNULL(ForecastBBC12.A11,0.00)), 
  SUM(ISNULL(ForecastBBC12.A12,0.00)),    ArtFamFC.TiempoEntrega,    ISNULL(Art.StockMinimo,0.00),     ISNULL(Art.StockMaximo,0.00)    FROM ForecastBBC12    JOIN  ArtFamFC ON ForecastBBC12.Familia   = ArtFamFC.Familia    JOIN  Art      ON ForecastBBC12.Articulo  = Art.Articulo    WHERE ForecastBBC12.Usuario = @Usuario ---AND ForecastBBC12.Articulo = 'A4902'   GROUP BY         ForecastBBC12.Articulo, 
    ArtFamFC.TiempoEntrega,      Art.StockMinimo,      Art.StockMaximo 
    OPEN crConsumo    
    FETCH NEXT FROM crConsumo INTO @Familia, @Inventario, @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12, 
                                @TiempoEntrega, @StockMinimo, @StockMaximo
    WHILE @@FETCH_STATUS <> -1    
    BEGIN    
      IF @@FETCH_STATUS <> -2     
      BEGIN
     
         SELECT @AP1=0.00,@AP2=0.00,@AP3=0.00,@AP4 = 0.00,@AP5 =0.00,@AP6 =0.00,
       @AP7=0.00,@AP8=0.00,@AP9=0.00,@AP10= 0.00,@AP11=0.00,@AP12=0.00,
    @IF1=0.00,@IF2=0.00,@IF3=0.00,@IF4 =0.00,@IF5 =0.00,@IF6 = 0.00, 
    @IF7=0.00,@IF8=0.00,@IF9=0.00,@IF10=0.00,@IF11=0.00,@IF12= 0.00,
    @SG1=0.00,@SG2=0.00,@SG3=0.00,@SG4 =0.00,@SG5 =0.00,@SG6 =0.00, 
    @SG7=0.00,@SG8=0.00,@SG9=0.00,@SG10=0.00,@SG11=0.00,@SG12=0.00, 
    @II1=0.00,@II2=0.00,@II3=0.00,@II4 =0.00,@II5 =0.00,@II6 =0.00, 
    @II7=0.00,@II8=0.00,@II9=0.00,@II10=0.00,@II11=0.00,@II12=0.00 
       INSERT INTO #Consumo (ID, Familia, Descripcion) 
      VALUES (1, @Familia, 'Inv Inicial')
     INSERT INTO #Consumo (ID, Familia, Descripcion,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12) 
     VALUES (2, @Familia, 'Forecast', @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12)
     INSERT INTO #Consumo (ID, Familia, Descripcion,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12) 
     VALUES (3, @Familia, '(+)  Mercancia enTransitos (arribos)', @A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12)
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (4, @Familia, 'Solicitud de generacion de embarque sugerido por sistema')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (5, @Familia, 'Arribos proyectados no confirmados')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (6, @Familia, '(=) Inventario final:')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (7, @Familia, 'Semanas de cobertura')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
     VALUES (8, @Familia, 'Lead time Semanas')
     INSERT INTO #Consumo (ID, Familia, Descripcion) 
                   VALUES (9, @Familia, NULL)
   
/** Semana 01 **/
       SELECT @II1 = @Inventario
    SELECT @IF1 = ISNULL(@II1,0.00) - ISNULL(@S1,0.00) +  ISNULL(@A1, 0.00) + ISNULL(@AP1,0.00)
       UPDATE #Consumo SET S1 = @II1  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S1 = @IF1  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S1 = ROUND(ISNULL(@IF1,0.00)  / NULLIF(@S1, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S1 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia 
    
    IF @IF1 < = ISNULL(@StockMinimo,0.00)  
    BEGIN
      SELECT @SG1 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF1,0.00), @Semana =  1 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S1 = @SG1  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG1, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S1 = @AP1 WHERE ID = 5 AND Familia = @Familia 
/** Semana 01 **/
/** Semana 02 **/
       SELECT @II2 = @IF1
    SELECT @IF2 = ISNULL(@II2,0.00) - ISNULL(@S2,0.00) +  ISNULL(@A2, 0.00) + ISNULL(@AP2,0.00)
       UPDATE #Consumo SET S2 = @II2  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S2 = @IF2  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S2 = ROUND(ISNULL(@IF2,0.00)  / NULLIF(@S2, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S2 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF2 < = @StockMinimo  
    BEGIN
      SELECT @SG2 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF2,0.00), @Semana =  2 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S2 = @SG2  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG2, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S2 = @AP2 WHERE ID = 5 AND Familia = @Familia
/** Semana 02 **/
/** Semana 03 **/
       SELECT @II3 = @IF2
    SELECT @IF3 = ISNULL(@II3,0.00) - ISNULL(@S3,0.00) +  ISNULL(@A3, 0.00) + ISNULL(@AP3,0.00)
       UPDATE #Consumo SET S3 = @II3  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S3 = @IF3  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S3 = ROUND(ISNULL(@IF3,0.00)  / NULLIF(@S3, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S3 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF3 < = @StockMinimo  
    BEGIN
      SELECT @SG3 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF3,0.00), @Semana =  3 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S3 = @SG3  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG3, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S3 = @AP3 WHERE ID = 5 AND Familia = @Familia 
/** Semana 03 **/
/** Semana 04 **/
       SELECT @II4 = @IF3
    SELECT @IF4 = ISNULL(@II4,0.00) - ISNULL(@S4,0.00) +  ISNULL(@A4, 0.00) + ISNULL(@AP4,0.00)
       UPDATE #Consumo SET S4 = @II4  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S4 = @IF4  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S4 = ROUND(ISNULL(@IF4,0.00)  / NULLIF(@S4, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S4 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF4 < = @StockMinimo  
    BEGIN
      SELECT @SG4 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF4,0.00), @Semana =  4 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S4 = @SG4  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG4, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S4 = @AP4 WHERE ID = 5 AND Familia = @Familia
/** Semana 04 **/
/** Semana 05 **/
       SELECT @II5 = @IF4
    SELECT @IF5 = ISNULL(@II5,0.00) - ISNULL(@S5,0.00) +  ISNULL(@A5, 0.00) + ISNULL(@AP5,0.00)
       UPDATE #Consumo SET S5 = @II5  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S5 = @IF5  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S5 = ROUND(ISNULL(@IF5,0.00)  / NULLIF(@S5, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S5 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF5 < = @StockMinimo  
    BEGIN
      SELECT @SG5 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF5,0.00), @Semana =  5 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S5 = @SG5  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG5, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S5 = @AP5 WHERE ID = 5 AND Familia = @Familia
/** Semana 05 **/
/** Semana 06 **/
       SELECT @II6 = @IF5
    SELECT @IF6 = ISNULL(@II6,0.00) - ISNULL(@S6,0.00) +  ISNULL(@A6, 0.00) + ISNULL(@AP6,0.00)
       UPDATE #Consumo SET S6 = @II6  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S6 = @IF6  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S6 = ROUND(ISNULL(@IF6,0.00)  / NULLIF(@S6, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S6 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF6 < = @StockMinimo  
    BEGIN
      SELECT @SG6 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF6,0.00), @Semana =  6 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S6 = @SG6  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG6, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S6 = @AP6 WHERE ID = 5 AND Familia = @Familia 
/** Semana 06 **/
/** Semana 07 **/
       SELECT @II7 = @IF6
    SELECT @IF7 = ISNULL(@II7,0.00) - ISNULL(@S7,0.00) +  ISNULL(@A7, 0.00) + ISNULL(@AP7,0.00)
       UPDATE #Consumo SET S7 = @II7  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S7 = @IF7  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S7 = ROUND(ISNULL(@IF7,0.00)  / NULLIF(@S7, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S7 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF7 < = @StockMinimo  
    BEGIN
      SELECT @SG7 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF7,0.00), @Semana =  7 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S7 = @SG7  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG7, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S7 = @AP7 WHERE ID = 5 AND Familia = @Familia 
/** Semana 07 **/
/** Semana 08 **/
       SELECT @II8 = @IF7
    SELECT @IF8 = ISNULL(@II8,0.00) - ISNULL(@S8,0.00) +  ISNULL(@A8, 0.00) + ISNULL(@AP8,0.00)
       UPDATE #Consumo SET S8 = @II8  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S8 = @IF8  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S8 = ROUND(ISNULL(@IF8,0.00)  / NULLIF(@S8, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S8 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF8 < = @StockMinimo  
    BEGIN
      SELECT @SG8 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF8,0.00), @Semana =  8 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S8 = @SG8  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG8, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
     
                 UPDATE #Consumo SET S8 = @AP8 WHERE ID = 5 AND Familia = @Familia 
/** Semana 08 **/
/** Semana 09 **/
       SELECT @II9 = @IF8
    SELECT @IF9 = ISNULL(@II9,0.00) - ISNULL(@S9,0.00) +  ISNULL(@A9, 0.00) + ISNULL(@AP9,0.00)
       UPDATE #Consumo SET S9 = @II9  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S9 = @IF9  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S9 = ROUND(ISNULL(@IF9,0.00)  / NULLIF(@S9, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S9 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF9 < = @StockMinimo  
    BEGIN
      SELECT @SG9 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF9,0.00), @Semana =  9 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S9 = @SG9  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG9, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                      @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S9 = @AP9 WHERE ID = 5 AND Familia = @Familia 
/** Semana 09 **/
/** Semana 10 **/
       SELECT @II10 = @IF9
    SELECT @IF10 = ISNULL(@II10,0.00) - ISNULL(@S10,0.00) +  ISNULL(@A10, 0.00) + ISNULL(@AP10,0.00)
       UPDATE #Consumo SET S10 = @II10  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S10 = @IF10  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S10 = ROUND(ISNULL(@IF10,0.00)  / NULLIF(@S10, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S10 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF10 < = @StockMinimo  
    BEGIN
      SELECT @SG10 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF10,0.00), @Semana =  10 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S10 = @SG10  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG10, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S10 = @AP10 WHERE ID = 5 AND Familia = @Familia 
/** Semana 10 **/
/** Semana 11 **/
       SELECT @II11 = @IF10
    SELECT @IF11 = ISNULL(@II11,0.00) - ISNULL(@S11,0.00) +  ISNULL(@A11, 0.00) + ISNULL(@AP11,0.00)
       UPDATE #Consumo SET S11 = @II11  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S11 = @IF11  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S11 = ROUND(ISNULL(@IF11,0.00)  / NULLIF(@S11, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S11 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF11 < = @StockMinimo  
    BEGIN
      SELECT @SG11 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF11,0.00), @Semana =  11 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S11 = @SG11  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG11, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S11 = @AP11 WHERE ID = 5 AND Familia = @Familia
/** Semana 11 **/
/** Semana 12 **/
       SELECT @II12 = @IF11
    SELECT @IF12 = ISNULL(@II12,0.00) - ISNULL(@S12,0.00) +  ISNULL(@A12, 0.00) + ISNULL(@AP12,0.00)
       UPDATE #Consumo SET S12 = @II12  WHERE ID = 1 AND Familia = @Familia
    UPDATE #Consumo SET S12 = @IF12  WHERE ID = 6 AND Familia = @Familia
       UPDATE #Consumo SET S12 = ROUND(ISNULL(@IF12,0.00)  / NULLIF(@S12, 0.00), 2) WHERE ID = 7 AND Familia = @Familia  
    UPDATE #Consumo SET S12 = @TiempoEntrega WHERE ID = 8 AND Familia = @Familia  
    IF @IF12 < = @StockMinimo  
    BEGIN
      SELECT @SG12 =  ISNULL(@StockMaximo,0.00) - ISNULL(@IF12,0.00), @Semana =  12 + ISNULL(@TiempoEntrega,0.00)
      IF @Semana < 13 
      BEGIN 
      UPDATE #Consumo SET S12 = @SG12  WHERE ID = 4 AND Familia = @Familia
      EXEC spWebArribosProyectados @Usuario, @Semana, @SG12, @AP1 OUTPUT, @AP2 OUTPUT, @AP3 OUTPUT, @AP4  OUTPUT, @AP5  OUTPUT, @AP6 OUTPUT,                                                                       @AP7 OUTPUT, @AP8 OUTPUT, @AP9 OUTPUT, @AP10 OUTPUT, @AP11 OUTPUT, @AP12 OUTPUT
      END
     END 
                 UPDATE #Consumo SET S12 = @AP12 WHERE ID = 5 AND Familia = @Familia 
/** Semana 12 **/
      END    
      FETCH NEXT FROM crConsumo INTO @Familia, @Inventario, @S1,@S2,@S3,@S4,@S5,@S6,@S7,@S8,@S9,@S10,@S11,@S12,@A1,@A2,@A3,@A4,@A5,@A6,@A7,@A8,@A9,@A10,@A11,@A12, 
                                  @TiempoEntrega, @StockMinimo, @StockMaximo
    END    
    CLOSE crConsumo    
    DEALLOCATE crConsumo 
      SELECT     #Consumo.ID,    #Consumo.Familia AS Articulo,     RTRIM(LTRIM(Art.Descripcion1)) AS Familia,    #Consumo.Descripcion,    #Consumo.S1,    #Consumo.S2,    #Consumo.S3,    #Consumo.S4,    #Consumo.S5,    #Consumo.S6,    #Consumo.S7,    #Consumo.S8,    #Consumo.S9,    #Consumo.S10,   #Consumo.S11,    #Consumo.S12  FROM #Consumo  JOIN Art ON #Consumo.Familia = Art.Articulo   ORDER BY       #Consumo.Articulo,        #Consumo.Familia,       #Consumo.ID       RETURN  END  
GO

/**************** spVacaPresupuestoForecastSemanal ****************/
if exists (select * from sysobjects where id = object_id('dbo.spVacaPresupuestoForecastSemanal') and type = 'P') DROP PROCEDURE dbo.spVacaPresupuestoForecastSemanal
GO
CREATE PROCEDURE spVacaPresupuestoForecastSemanal    
  @Usuario    varchar(50) = 'MASERP',   
  @Ejercicio   int,   
  @Semana      int   
AS BEGIN   
DECLARE   
@Empresa  char(5) = 'INCF',   
@S1       varchar(5),   
@FechaD   datetime,   
@FechaA   datetime,  
@Dias     int = 5,   
@SQL      nvarchar(MAX) = ''  
SELECT @S1 = 'S'+CONVERT(char, @Semana)   
IF OBJECT_ID('tempdb..#VacaPresupuesto') IS NOT NULL DROP TABLE #VacaPresupuesto  
 SELECT @FechaD = DIM_TIEMPO_SEMANA.FECHAINICIO,   
        @FechaA = DIM_TIEMPO_SEMANA.FECHAFIN     
  FROM      
       DIM_TIEMPO_SEMANA     
    WHERE DIM_TIEMPO_SEMANA.AÑO = @Ejercicio  AND   
       DIM_TIEMPO_SEMANA.SEMANA = @Semana      
CREATE TABLE #VacaPresupuesto (      
    Usuario                  varchar(50)  COLLATE Database_Default NULL,  
    Prioridad                int                                     NULL,  
    CentroTrabajo            varchar(100) COLLATE Database_Default NULL,  
    Ejercicio                int                                     NULL,  
    Concepto                 varchar(50)  COLLATE Database_Default NULL,  
    Articulo                 varchar(50)  COLLATE Database_Default NULL,  
    Descripcion1             varchar(255) COLLATE Database_Default NULL,  
    Cliente                  varchar(50)  COLLATE Database_Default NULL,  
    NombreCliente            varchar(255) COLLATE Database_Default NULL,  
    Programa                 varchar(50)  COLLATE Database_Default NULL,  
    Cantidad                 float                                 NULL,  
    GramajeFC                float                                 NULL,  
    FamArtCF                 varchar(50)  COLLATE Database_Default NULL,  
    VarArtCF                 varchar(50)  COLLATE Database_Default NULL,  
    Factorstock              float                                 NULL,  
    SaldoInventario          float                                 NULL,   
 Venta                    float                                 NULL,   
 Producido                float                                 NULL,   
 InventarioFinal          float                                 NULL,   
 VentaDias                float                                 NULL)  
SET @SQL = '  
INSERT INTO #VacaPresupuesto (  
    Usuario,   
    Prioridad,   
    CentroTrabajo,   
    Ejercicio,   
    Concepto,   
    Articulo,  
    Descripcion1,   
    Cliente,   
    NombreCliente,   
    Programa,   
    Cantidad,   
    GramajeFC,  
    FamArtCF,   
    VarArtCF,   
    Factorstock  
)  
SELECT   
    ''' + @Usuario + ''',       
    ROW_NUMBER() OVER (ORDER BY VacaPresupuestoVtaConD.Prioridad),       
    dbo.fnFCCentroTrabajo(  
        ''' + @Usuario + ''',   
        VacaPresupuestoVtaConD.Articulo,      
        VacaPresupuestoVtaConD.Concepto,       
        VacaPresupuestoVtaConD.Cliente,      
        VacaPresupuestoVtaConD.Programa  
    ),       
    VacaPresupuestoVtaConD.Ejercicio,      
    VacaPresupuestoVtaConD.Concepto,      
    VacaPresupuestoVtaConD.Articulo,      
    Art.Descripcion1,      
    VacaPresupuestoVtaConD.Cliente,      
    Cte.Nombre,       
    VacaPresupuestoVtaConD.Programa,   
    VacaPresupuestoVtaConD.' + @S1 + ',       
    ISNULL(Art.GramajeFC, 0),           
    ISNULL(Art.FamArtCF, ''vacio''),      
    ISNULL(Art.VarArtCF, ''vacio''),       
    Art.Factorstock  
FROM VacaPresupuestoVtaConD        
    LEFT JOIN Art ON VacaPresupuestoVtaConD.Articulo = Art.Articulo        
    LEFT JOIN Cte ON VacaPresupuestoVtaConD.Cliente = Cte.Cliente      
    LEFT JOIN VacaPresupuestoVtaCon ON VacaPresupuestoVtaConD.ID = VacaPresupuestoVtaCon.ID      
WHERE VacaPresupuestoVtaConD.Ejercicio = ' + CAST(@Ejercicio AS VARCHAR(10)) + '  
    AND VacaPresupuestoVtaCon.Estatus = ''CONCLUIDO''  
    AND VacaPresupuestoVtaConD.' + @S1 + ' > 0  
ORDER BY VacaPresupuestoVtaConD.Prioridad,     
    VacaPresupuestoVtaConD.Ejercicio,   
    VacaPresupuestoVtaConD.Concepto'  
    EXEC (@SQL)  
UPDATE #VacaPresupuesto SET SaldoInventario = dbo.fn_ObtenerSaldoInventario    (@Empresa, Articulo, DATEADD(day, -1, @FechaD)),   
                                   Venta = dbo.fnWebVentaFechasAcumFactura  (@Empresa, Articulo, @FechaD, @FechaA),   
                               Producido = dbo.fnWebArtAcumProduciendoFechas(@Empresa, Articulo, @FechaD, @FechaA)  
          UPDATE #VacaPresupuesto SET   
          InventarioFinal = ISNULL(#VacaPresupuesto.SaldoInventario,0.00) +   
                            ISNULL(#VacaPresupuesto.Producido,0.00) -   
                ISNULL(#VacaPresupuesto.Venta,0.00),   
          VentaDias       = ISNULL(#VacaPresupuesto.Venta,0.00) / ISNULL(@Dias,0.00)  
 SELECT   
        #VacaPresupuesto.Usuario,  
        #VacaPresupuesto.Prioridad,  
        #VacaPresupuesto.CentroTrabajo,  
        #VacaPresupuesto.Ejercicio,  
        #VacaPresupuesto.Concepto,  
        #VacaPresupuesto.Articulo,  
        #VacaPresupuesto.Descripcion1,  
        #VacaPresupuesto.Cliente,  
        #VacaPresupuesto.NombreCliente,  
        #VacaPresupuesto.Programa,  
        #VacaPresupuesto.Cantidad,  
     ROUND(ISNULL(#VacaPresupuesto.SaldoInventario,0.00) / NULLIF(ISNULL(VentaDias,0.00),0),2)  AS  DOHInicial,   
        #VacaPresupuesto.SaldoInventario,   
  #VacaPresupuesto.Venta,   
  #VacaPresupuesto.Producido,   
  #VacaPresupuesto.InventarioFinal,   
  ROUND(ISNULL(#VacaPresupuesto.InventarioFinal,0.00) / NULLIF(ISNULL(VentaDias,0.00),0),2)  AS  DOHFinal  
    FROM #VacaPresupuesto   
 ORDER BY #VacaPresupuesto.SaldoInventario DESC   
RETURN   
END   
GO

/**************** spWebCompraArribos ****************/
if exists (select * from sysobjects where id = object_id('dbo.spWebCompraArribos') and type = 'P') DROP PROCEDURE dbo.spWebCompraArribos
GO
CREATE PROCEDURE [dbo].[spWebCompraArribos]      
AS         
    BEGIN         
        DECLARE         
    @_S1_F DATE,       
    @_S1_FI DATE,       
    @_S1_FF DATE,       
    @_S1_N SMALLINT,         
             @_S2_F DATE,       
    @_S2_FI DATE,       
    @_S2_FF DATE,       
    @_S2_N SMALLINT,         
             @_S3_F DATE,       
    @_S3_FI DATE,       
    @_S3_FF DATE,       
    @_S3_N SMALLINT,         
             @_S4_F DATE,       
    @_S4_FI DATE,       
    @_S4_FF DATE,       
    @_S4_N SMALLINT,         
             @_S5_F DATE,       
    @_S5_FI DATE,       
    @_S5_FF DATE,       
    @_S5_N SMALLINT,       
    @ST1    char(5),       
    @ST2    char(5),       
    @ST3    char(5),       
    @ST4    char(5),       
    @ST5    char(5),       
    @SQL   varchar(255)      
        --#############################[ FECHA INICIO DE 5 SEMANAS ]        
        SET @_S1_F = GETDATE();        
        SET @_S2_F = DATEADD(DAY, 7, @_S1_F);        
        SET @_S3_F = DATEADD(DAY, 7, @_S2_F);        
        SET @_S4_F = DATEADD(DAY, 7, @_S3_F);        
        SET @_S5_F = DATEADD(DAY, 7, @_S4_F);        
        --#############################[ FECHA INICIO Y FIN DE 5 SEMANAS ]        
        SELECT @_S1_N = SEMANA_ISO FROM DBO.DIM_TIEMPO_SEMANA_ISO WITH (NOLOCK) WHERE (@_S1_F BETWEEN FI AND FF);        
        SELECT @_S2_N = SEMANA_ISO FROM DBO.DIM_TIEMPO_SEMANA_ISO WITH (NOLOCK) WHERE (@_S2_F BETWEEN FI AND FF);        
        SELECT @_S3_N = SEMANA_ISO FROM DBO.DIM_TIEMPO_SEMANA_ISO WITH (NOLOCK) WHERE (@_S3_F BETWEEN FI AND FF);        
        SELECT @_S4_N = SEMANA_ISO FROM DBO.DIM_TIEMPO_SEMANA_ISO WITH (NOLOCK) WHERE (@_S4_F BETWEEN FI AND FF);        
        SELECT @_S5_N = SEMANA_ISO FROM DBO.DIM_TIEMPO_SEMANA_ISO WITH (NOLOCK) WHERE (@_S5_F BETWEEN FI AND FF);        
 SELECT @ST1 = 'S'+CONVERT(varchar,@_S1_N),       
        @ST2 = 'S'+CONVERT(varchar,@_S2_N),      
     @ST3 = 'S'+CONVERT(varchar,@_S3_N),      
     @ST4 = 'S'+CONVERT(varchar,@_S4_N),       
     @ST5 = 'S'+CONVERT(varchar,@_S5_N)      
  CREATE TABLE #Arribos (          
   ID               int    NOT NULL IDENTITY(1,1),          
  FAMILIA           varchar(50)  COLLATE Database_Default NULL,       
  LINEA           varchar(60)  COLLATE Database_Default NULL,      
  COSTOPROMEDIO   float NULL,      
  DISPONIBLETOTAL   float NULL,      
  INV_AV_CI       float NULL,      
  INV_AV_CF       float NULL,      
  INV_PDB_GDL       float NULL,      
  INV_PDB_CF       float NULL,      
  INV_PDB_CI       float NULL,      
  INV_ICF_RX       float NULL,      
  INV_ICF_40TENA   float NULL,       
  INV_ICF_CHI       float NULL,      
  INV_ICF_SJ       float NULL,      
  INV_ICF_CI       float NULL,      
  INV_ICF           float NULL,      
  INV_TOTAL       float NULL,      
  INVTCF            float NULL,      
  INVTVACA          float NULL,      
  INVTPULSES        float NULL,      
  INVTVACAYPULSES   float NULL,      
  ARRIBOTOTAL       float NULL,       
     EXISTENCIASICF    float NULL,       
  ARRIBOSICF        float NULL,       
     DISPONIBILIDADTOTALICF  float NULL,       
  EXISTENCIASVACA   float NULL,       
     ARRIBOSVACA       float NULL,       
  DISPONIBILIDADTOTALVACA  float NULL,        
        EXISTENCIASPULSE  float NULL,       
  S0    float NULL,       
  S1    float NULL,      
  S2    float NULL,      
  S3    float NULL,      
  S4    float NULL,      
  S5    float NULL,      
  S6    float NULL,      
  S7    float NULL,      
  S8    float NULL,      
  S9    float NULL,      
  S10    float NULL,      
  S11    float NULL,      
  S12    float NULL,      
  S13    float NULL,      
  S14    float NULL,      
  S15    float NULL,      
  S16    float NULL,      
  S17    float NULL,      
  S18    float NULL,      
  S19    float NULL,      
  S20    float NULL,      
  S21    float NULL,      
  S22    float NULL,      
  S23    float NULL,      
  S24    float NULL,      
  S25    float NULL,      
  S26    float NULL,      
  S27    float NULL,      
  S28    float NULL,      
  S29    float NULL,      
  S30    float NULL,      
  S31    float NULL,      
  S32    float NULL,      
  S33    float NULL,      
  S34    float NULL,      
  S35    float NULL,      
  S36    float NULL,      
  S37    float NULL,      
  S38    float NULL,      
  S39    float NULL,      
  S40    float NULL,      
  S41    float NULL,      
  S42    float NULL,      
  S43    float NULL,      
  S44    float NULL,      
  S45    float NULL,      
  S46    float NULL,      
  S47    float NULL,      
  S48    float NULL,      
  S49    float NULL,      
  S50    float NULL,      
  S51    float NULL,      
  S52    float NULL,      
  S53    float NULL,      
  S54    float NULL)      
INSERT INTO #Arribos(      
 FAMILIA,      
 LINEA,       
 COSTOPROMEDIO,       
 DISPONIBLETOTAL,       
 INV_AV_CI,       
 INV_AV_CF,       
 INV_PDB_GDL,      
 INV_PDB_CF,       
 INV_PDB_CI,       
 INV_ICF_RX,       
 INV_ICF_40TENA,       
 INV_ICF_CHI,       
 INV_ICF_SJ,       
 INV_ICF_CI,       
 INV_ICF,       
 INV_TOTAL,    
 S0,   
 S1,        
 S2,       
 S3,       
 S4,       
 S5,      
 ARRIBOTOTAL,      
 EXISTENCIASICF,      
 ARRIBOSICF,      
 DISPONIBILIDADTOTALICF,       
 EXISTENCIASVACA,      
 ARRIBOSVACA,      
 DISPONIBILIDADTOTALVACA,       
 EXISTENCIASPULSE)      
       EXEC [192.168.1.11].[INTELISIS5000].DBO.SpWebCompraArribos      
   SELECT @sql= ''        
          SET @sql = 'UPDATE #Arribos SET ' +      RTRIM(LTRIM(@ST1))  +' =S1,'+                   
                                                   RTRIM(LTRIM(@ST2))  +' =S2,'+                   
                                                   RTRIM(LTRIM(@ST3))  +' =S3,'+         
               RTRIM(LTRIM(@ST4))  +' =S4,'+         
               RTRIM(LTRIM(@ST5))  +' =S5'            
           EXEC (@Sql)         
UPDATE #Arribos SET S1 = NULL, S2 = NULL, S3 = NULL, S4 = NULL, S5 = NULL       
SELECT        
 #Arribos.ID,      
 #Arribos.FAMILIA,      
 #Arribos.LINEA,      
 #Arribos.COSTOPROMEDIO,      
 #Arribos.DISPONIBLETOTAL,      
 #Arribos.INV_AV_CI,      
 #Arribos.INV_AV_CF,      
 #Arribos.INV_PDB_GDL,      
 #Arribos.INV_PDB_CF,      
 #Arribos.INV_PDB_CI,      
 #Arribos.INV_ICF_RX,      
 #Arribos.INV_ICF_40TENA,      
 #Arribos.INV_ICF_CHI,      
 #Arribos.INV_ICF_SJ,      
 #Arribos.INV_ICF_CI,      
 #Arribos.INV_ICF,      
 #Arribos.EXISTENCIASICF,      
 #Arribos.ARRIBOSICF,      
 #Arribos.DISPONIBILIDADTOTALICF,      
 #Arribos.EXISTENCIASVACA AS EXISTENCIASAVC,      
 #Arribos.ARRIBOSVACA     AS ARRIBOSAVC,      
 #Arribos.DISPONIBILIDADTOTALVACA AS DISPONIBILIDADTOTALAVC,       
 #Arribos.EXISTENCIASPULSE,    
 #Arribos.S0 AS ARRIBOSANTES,        
 #Arribos.S1,      
 #Arribos.S2,      
 #Arribos.S3,      
 #Arribos.S4,      
 #Arribos.S5,      
 #Arribos.S6,      
 #Arribos.S7,      
 #Arribos.S8,      
 #Arribos.S9,      
 #Arribos.S10,      
 #Arribos.S11,      
 #Arribos.S12,      
 #Arribos.S13,      
 #Arribos.S14,      
 #Arribos.S15,      
 #Arribos.S16,      
 #Arribos.S17,      
 #Arribos.S18,      
 #Arribos.S19,      
 #Arribos.S20,      
 #Arribos.S21,      
 #Arribos.S22,      
 #Arribos.S23,      
 #Arribos.S24,      
 #Arribos.S25,      
 #Arribos.S26,      
 #Arribos.S27,      
 #Arribos.S28,      
 #Arribos.S29,      
 #Arribos.S30,      
 #Arribos.S31,      
 #Arribos.S32,      
 #Arribos.S33,      
 #Arribos.S34,      
 #Arribos.S35,      
 #Arribos.S36,      
 #Arribos.S37,      
 #Arribos.S38,      
 #Arribos.S39,      
 #Arribos.S40,      
 #Arribos.S41,      
 #Arribos.S42,      
 #Arribos.S43,      
 #Arribos.S44,      
 #Arribos.S45,      
 #Arribos.S46,      
 #Arribos.S47,      
 #Arribos.S48,      
 #Arribos.S49,      
 #Arribos.S50,      
 #Arribos.S51,      
 #Arribos.S52,      
 #Arribos.S53,      
 #Arribos.S54      
FROM #Arribos       
WHERE LINEA NOT LIKE '%CANELA%'    
 ORDER BY ID       
  RETURN       
    END  
GO

/**************** spFCArribosVaca ****************/
if exists (select * from sysobjects where id = object_id('dbo.spFCArribosVaca') and type = 'P') DROP PROCEDURE dbo.spFCArribosVaca
GO
CREATE PROCEDURE spFCArribosVaca                     @Usuario      varchar(10),       @FechaD       datetime,        @FechaA       datetime  AS BEGIN   DELETE FCArribos WHERE Usuario = @Usuario     INSERT INTO FCArribos (Usuario, CompraID, Empresa, Mov, MovID, Articulo, Fecha, Cantidad, AlmacenArribo)            SELECT @Usuario, 
         C.ID,
         C.Empresa, 
      C.Mov, 
      C.MovID, 
               CD.Articulo,  
               CD.FechaEntrega,   
            CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END, 
      CD.Almacen
        FROM 
             [192.168.1.11].INTELISIS5000.DBO.COMPRA  AS C   WITH (NOLOCK)  
              JOIN [192.168.1.11].INTELISIS5000.DBO.COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID  
     JOIN [192.168.1.11].INTELISIS5000.DBO.Art      AS A  WITH (NOLOCK) ON CD.Articulo = A.Articulo  
        WHERE  
            (C.EMPRESA IN ('VACA', 'PDB'))  
        AND (C.ESTATUS IN ('PENDIENTE'))  
        AND (C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS'))  
        --AND (C.MONEDA  = 'DOLARES')  
        AND (CD.FECHAENTREGA BETWEEN @FechaD AND @FechaA)
     AND YEAR(C.FechaEmision) > 2023  
        AND CD.CANTIDADPENDIENTE> 0.00  
  AND A.Estatus = 'ALTA'
    
 INSERT INTO FCArribos (Usuario,  CompraID, Empresa,  Mov, MovID, Articulo, Fecha, Cantidad, AlmacenArribo)            SELECT 
       @Usuario, 
    C.ID,
    C.Empresa, 
    C.Mov, 
    C.MovID, 
             CD.Articulo,  
             CD.FechaEntrega,   
          CASE WHEN C.ESTATUS = 'BORRADOR' THEN ROUND(ISNULL(CD.CANTIDAD, 0), 4) ELSE ROUND(ISNULL(CD.CANTIDADPENDIENTE, 0), 4) END, 
    CD.Almacen
        FROM 
             DBO.COMPRA            AS C   WITH (NOLOCK)  
              JOIN DBO.COMPRAD AS CD  WITH (NOLOCK) ON C.ID = CD.ID 
     JOIN DBO.Art     AS  A  WITH (NOLOCK) ON CD.Articulo = A.Articulo  
        WHERE  
            (C.EMPRESA = 'INCF')  
        AND (C.ESTATUS IN ('PENDIENTE'))  
        AND (C.MOV     IN ('ORDEN COMPRA','ORDEN CON GASTOS'))  
        AND (CD.FECHAENTREGA BETWEEN @FechaD AND @FechaA)  
  AND YEAR(C.FechaEmision) > 2023  
        AND CD.CANTIDADPENDIENTE> 0.00  
  AND A.Estatus = 'ALTA'
RETURN 
END
GO




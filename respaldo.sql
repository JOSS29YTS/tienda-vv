-- MySQL dump 10.13  Distrib 8.2.0, for Win64 (x86_64)
--
-- Host: switchback.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categoria`
--

DROP TABLE IF EXISTS `categoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria` (
  `id_categoria` int NOT NULL AUTO_INCREMENT,
  `nb_categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria`
--

LOCK TABLES `categoria` WRITE;
/*!40000 ALTER TABLE `categoria` DISABLE KEYS */;
INSERT INTO `categoria` VALUES (1,'Dama'),(2,'Caballero'),(3,'Niño'),(4,'Niña'),(5,'Hogar'),(6,'Escolar'),(7,'Media'),(8,'Segunda'),(9,'Baru'),(10,'Zapato');
/*!40000 ALTER TABLE `categoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compra`
--

DROP TABLE IF EXISTS `compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compra` (
  `id_compra` int NOT NULL AUTO_INCREMENT,
  `fecha_compra` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` int NOT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `total_compra` decimal(16,6) DEFAULT NULL,
  `id_estado_compra` int NOT NULL,
  `id_metodo_pago` int DEFAULT NULL,
  PRIMARY KEY (`id_compra`),
  KEY `fk_compra_usuario` (`id_usuario`),
  KEY `fk_compra_estado` (`id_estado_compra`),
  KEY `fk_compra_metodo` (`id_metodo_pago`),
  CONSTRAINT `fk_compra_estado` FOREIGN KEY (`id_estado_compra`) REFERENCES `estado_compra` (`id_estado_compra`),
  CONSTRAINT `fk_compra_metodo` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `fk_compra_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compra`
--

LOCK TABLES `compra` WRITE;
/*!40000 ALTER TABLE `compra` DISABLE KEYS */;
INSERT INTO `compra` VALUES (1,'2025-01-01 00:00:00',1,1.0000,9034.500000,1,4);
/*!40000 ALTER TABLE `compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion` (
  `id_configuracion` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_configuracion`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (1,'tasa_dolar','419.9873','2026-02-28 10:19:14');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_compra`
--

DROP TABLE IF EXISTS `detalle_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_compra` (
  `id_detalle_compra` int NOT NULL AUTO_INCREMENT,
  `id_compra` int NOT NULL,
  `id_producto` int NOT NULL,
  `cantidad` int NOT NULL,
  `costo` decimal(14,4) NOT NULL,
  `ganancia` decimal(14,4) NOT NULL,
  `precio_venta` decimal(14,4) NOT NULL,
  PRIMARY KEY (`id_detalle_compra`),
  KEY `id_compra` (`id_compra`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `detalle_compra_ibfk_1` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`) ON DELETE CASCADE,
  CONSTRAINT `detalle_compra_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_compra`
--

LOCK TABLES `detalle_compra` WRITE;
/*!40000 ALTER TABLE `detalle_compra` DISABLE KEYS */;
INSERT INTO `detalle_compra` VALUES (1,1,1,4,0.0000,12.0000,12.0000),(2,1,2,2,0.0000,10.0000,10.0000),(3,1,3,1,0.0000,4.0000,4.0000),(4,1,4,8,0.0000,8.0000,8.0000),(5,1,5,1,0.0000,8.0000,8.0000),(6,1,6,7,0.0000,2.0000,2.0000),(7,1,7,19,0.0000,2.0000,2.0000),(8,1,8,21,0.0000,6.0000,6.0000),(9,1,9,4,0.0000,6.0000,6.0000),(10,1,10,4,0.0000,6.0000,6.0000),(11,1,11,6,0.0000,14.0000,14.0000),(12,1,12,19,0.0000,6.0000,6.0000),(13,1,13,7,0.0000,8.0000,8.0000),(14,1,14,14,0.0000,7.0000,7.0000),(15,1,15,11,0.0000,8.0000,8.0000),(16,1,16,4,0.0000,3.0000,3.0000),(17,1,17,10,0.0000,7.0000,7.0000),(18,1,18,18,0.0000,6.0000,6.0000),(19,1,19,9,0.0000,8.0000,8.0000),(20,1,20,6,0.0000,6.0000,6.0000),(21,1,21,1,0.0000,12.0000,12.0000),(22,1,22,2,0.0000,5.0000,5.0000),(23,1,23,1,0.0000,6.0000,6.0000),(24,1,24,3,0.0000,6.0000,6.0000),(25,1,25,3,0.0000,3.0000,3.0000),(26,1,26,36,0.0000,3.0000,3.0000),(27,1,27,12,0.0000,10.0000,10.0000),(28,1,28,9,0.0000,10.0000,10.0000),(29,1,29,8,0.0000,8.0000,8.0000),(30,1,30,2,0.0000,8.0000,8.0000),(31,1,31,3,0.0000,16.0000,16.0000),(32,1,32,4,0.0000,12.0000,12.0000),(33,1,33,6,0.0000,5.0000,5.0000),(34,1,34,21,0.0000,15.0000,15.0000),(35,1,35,13,0.0000,5.0000,5.0000),(36,1,36,8,0.0000,3.0000,3.0000),(37,1,37,23,0.0000,4.0000,4.0000),(38,1,38,20,0.0000,8.0000,8.0000),(39,1,39,1,0.0000,10.0000,10.0000),(40,1,40,9,0.0000,6.0000,6.0000),(41,1,41,22,0.0000,6.0000,6.0000),(42,1,42,12,0.0000,7.0000,7.0000),(43,1,43,20,0.0000,6.0000,6.0000),(44,1,44,13,0.0000,5.0000,5.0000),(45,1,45,7,0.0000,5.0000,5.0000),(46,1,46,2,0.0000,7.0000,7.0000),(47,1,47,7,0.0000,7.0000,7.0000),(48,1,48,9,0.0000,10.0000,10.0000),(49,1,49,5,0.0000,8.0000,8.0000),(50,1,50,4,0.0000,10.0000,10.0000),(51,1,51,1,0.0000,5.0000,5.0000),(52,1,52,34,0.0000,5.0000,5.0000),(53,1,53,12,0.0000,4.0000,4.0000),(54,1,54,14,0.0000,4.0000,4.0000),(55,1,55,3,0.0000,10.0000,10.0000),(56,1,56,3,0.0000,4.0000,4.0000),(57,1,57,1,0.0000,6.0000,6.0000),(58,1,58,12,0.0000,4.0000,4.0000),(59,1,59,7,0.0000,4.0000,4.0000),(60,1,60,12,0.0000,6.0000,6.0000),(61,1,61,18,0.0000,10.0000,10.0000),(62,1,62,3,0.0000,7.0000,7.0000),(63,1,63,11,0.0000,15.0000,15.0000),(64,1,64,2,0.0000,10.0000,10.0000),(65,1,65,20,0.0000,5.0000,5.0000),(66,1,66,2,0.0000,4.0000,4.0000),(67,1,67,3,0.0000,5.0000,5.0000),(68,1,68,1,0.0000,4.0000,4.0000),(69,1,69,49,0.0000,5.0000,5.0000),(70,1,70,39,0.0000,4.0000,4.0000),(71,1,71,11,0.0000,8.0000,8.0000),(72,1,72,1,0.0000,16.0000,16.0000),(73,1,73,8,0.0000,15.0000,15.0000),(74,1,74,1,0.0000,14.0000,14.0000),(75,1,76,12,0.0000,5.0000,5.0000),(76,1,77,2,0.0000,6.0000,6.0000),(77,1,78,5,0.0000,6.0000,6.0000),(78,1,79,3,0.0000,4.0000,4.0000),(79,1,80,7,0.0000,4.0000,4.0000),(80,1,81,1,0.0000,4.0000,4.0000),(81,1,82,3,0.0000,8.0000,8.0000),(82,1,83,4,0.0000,5.0000,5.0000),(83,1,84,1,0.0000,15.0000,15.0000),(84,1,85,2,0.0000,10.0000,10.0000),(85,1,86,11,0.0000,1.0000,1.0000),(86,1,87,2,0.0000,1.0000,1.0000),(87,1,88,20,0.0000,1.0000,1.0000),(88,1,89,9,0.0000,1.5000,1.5000),(89,1,90,3,0.0000,3.0000,3.0000),(90,1,91,12,0.0000,1.0000,1.0000),(91,1,92,57,0.0000,1.0000,1.0000),(92,1,94,8,0.0000,3.0000,3.0000),(93,1,95,15,0.0000,2.0000,2.0000),(94,1,96,10,0.0000,1.0000,1.0000),(95,1,97,48,0.0000,1.5000,1.5000),(96,1,98,9,0.0000,1.0000,1.0000),(97,1,99,6,0.0000,1.0000,1.0000),(98,1,100,2,0.0000,1.0000,1.0000),(99,1,101,1,0.0000,2.0000,2.0000),(100,1,102,12,0.0000,2.0000,2.0000),(101,1,103,14,0.0000,7.0000,7.0000),(102,1,104,3,0.0000,6.0000,6.0000),(103,1,105,1,0.0000,7.0000,7.0000),(104,1,107,6,0.0000,6.0000,6.0000),(105,1,108,22,0.0000,5.0000,5.0000),(106,1,109,9,0.0000,6.0000,6.0000),(107,1,110,3,0.0000,1.0000,1.0000),(108,1,111,34,0.0000,6.0000,6.0000),(109,1,112,3,0.0000,8.0000,8.0000),(110,1,113,7,0.0000,8.0000,8.0000),(111,1,114,6,0.0000,8.0000,8.0000),(112,1,115,7,0.0000,8.0000,8.0000),(113,1,116,7,0.0000,8.0000,8.0000),(114,1,117,8,0.0000,12.0000,12.0000),(115,1,118,7,0.0000,12.0000,12.0000),(116,1,119,8,0.0000,8.0000,8.0000),(117,1,120,12,0.0000,10.0000,10.0000),(118,1,121,2,0.0000,12.0000,12.0000),(119,1,122,7,0.0000,12.0000,12.0000),(120,1,123,3,0.0000,8.0000,8.0000),(121,1,124,9,0.0000,8.0000,8.0000),(122,1,125,20,0.0000,8.0000,8.0000),(123,1,126,9,0.0000,13.0000,13.0000),(124,1,127,14,0.0000,12.0000,12.0000),(125,1,128,1,0.0000,12.0000,12.0000),(126,1,129,23,0.0000,12.0000,12.0000),(127,1,131,9,0.0000,1.0000,1.0000),(128,1,132,20,0.0000,2.0000,2.0000),(129,1,133,3,0.0000,2.0000,2.0000),(130,1,134,6,0.0000,2.0000,2.0000),(131,1,135,6,0.0000,2.0000,2.0000),(132,1,136,28,0.0000,3.0000,3.0000),(133,1,137,10,0.0000,6.0000,6.0000),(134,1,138,5,0.0000,6.0000,6.0000),(135,1,139,1,0.0000,6.0000,6.0000),(136,1,141,6,0.0000,7.0000,7.0000),(137,1,142,1,0.0000,20.0000,20.0000),(138,1,143,1,0.0000,8.0000,8.0000),(139,1,144,5,0.0000,8.0000,8.0000),(140,1,145,2,0.0000,6.0000,6.0000),(141,1,146,2,0.0000,12.0000,12.0000),(142,1,147,2,0.0000,2.0000,2.0000),(143,1,148,1,0.0000,3.0000,3.0000),(144,1,149,1,0.0000,5.0000,5.0000),(145,1,150,9,0.0000,6.0000,6.0000),(146,1,151,9,0.0000,8.0000,8.0000),(147,1,152,8,0.0000,7.0000,7.0000),(148,1,153,8,0.0000,10.0000,10.0000),(149,1,154,12,0.0000,5.0000,5.0000),(150,1,155,6,0.0000,2.0000,2.0000),(151,1,156,12,0.0000,5.0000,5.0000),(152,1,157,12,0.0000,4.0000,4.0000),(153,1,158,24,0.0000,4.0000,4.0000),(154,1,159,3,0.0000,3.0000,3.0000),(155,1,160,12,0.0000,14.0000,14.0000),(156,1,161,4,0.0000,12.0000,12.0000),(157,1,162,5,0.0000,12.0000,12.0000),(158,1,163,20,0.0000,1.0000,1.0000),(159,1,164,10,0.0000,6.0000,6.0000),(160,1,165,8,0.0000,5.0000,5.0000),(161,1,166,5,0.0000,5.0000,5.0000),(162,1,167,12,0.0000,10.0000,10.0000),(163,1,168,12,0.0000,10.0000,10.0000),(164,1,170,2,0.0000,6.0000,6.0000),(165,1,171,1,0.0000,15.0000,15.0000),(166,1,172,1,0.0000,25.0000,25.0000),(167,1,173,1,0.0000,25.0000,25.0000),(168,1,174,1,0.0000,5.0000,5.0000),(169,1,175,4,0.0000,5.0000,5.0000),(170,1,176,1,0.0000,5.0000,5.0000);
/*!40000 ALTER TABLE `detalle_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_pago`
--

DROP TABLE IF EXISTS `detalle_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_pago` (
  `id_detalle_pago` int NOT NULL AUTO_INCREMENT,
  `id_pago` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  PRIMARY KEY (`id_detalle_pago`),
  KEY `id_pago` (`id_pago`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `detalle_pago_ibfk_1` FOREIGN KEY (`id_pago`) REFERENCES `pago` (`id_pago`) ON DELETE CASCADE,
  CONSTRAINT `detalle_pago_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_pago`
--

LOCK TABLES `detalle_pago` WRITE;
/*!40000 ALTER TABLE `detalle_pago` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_pago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_venta`
--

DROP TABLE IF EXISTS `detalle_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_venta` (
  `id_detalle_venta` int NOT NULL AUTO_INCREMENT,
  `id_venta` int NOT NULL,
  `id_producto` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(14,4) NOT NULL,
  PRIMARY KEY (`id_detalle_venta`),
  KEY `id_venta` (`id_venta`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `detalle_venta_ibfk_1` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`) ON DELETE CASCADE,
  CONSTRAINT `detalle_venta_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_venta`
--

LOCK TABLES `detalle_venta` WRITE;
/*!40000 ALTER TABLE `detalle_venta` DISABLE KEYS */;
INSERT INTO `detalle_venta` VALUES (1,1,1,1,12.0000),(2,1,4,3,8.0000),(3,1,7,3,2.0000),(4,1,8,3,6.0000),(5,1,9,4,6.0000),(6,1,10,1,6.0000),(7,1,12,2,6.0000),(8,1,18,4,6.0000),(9,1,23,2,6.0000),(10,1,24,1,6.0000),(11,1,25,1,3.0000),(12,1,38,5,8.0000),(13,1,43,1,6.0000),(14,1,49,2,8.0000),(15,1,52,8,5.0000),(16,1,53,1,4.0000),(17,1,60,4,6.0000),(18,1,61,2,10.0000),(19,1,62,4,7.0000),(20,1,64,1,10.0000),(21,1,65,2,5.0000),(22,1,69,7,5.0000),(23,1,70,14,4.0000),(24,1,86,1,1.0000),(25,1,87,2,1.0000),(26,1,88,3,1.0000),(27,1,91,3,1.0000),(28,1,94,1,3.0000),(29,1,101,1,2.0000),(30,1,107,1,6.0000),(31,1,109,4,6.0000),(32,1,110,3,1.0000),(33,1,111,10,6.0000),(34,1,112,1,8.0000),(35,1,113,1,8.0000),(36,1,116,3,8.0000),(37,1,118,1,12.0000),(38,1,119,3,8.0000),(39,1,123,3,8.0000),(40,1,126,1,13.0000),(41,1,129,1,12.0000),(42,1,130,1,12.0000),(43,1,131,3,1.0000),(44,1,132,1,2.0000),(45,1,136,5,3.0000),(46,1,137,1,6.0000),(47,1,138,3,6.0000),(48,1,141,3,7.0000),(49,1,149,1,5.0000),(50,1,150,3,6.0000),(51,1,152,3,7.0000),(52,1,155,3,2.0000),(53,1,156,2,5.0000),(54,1,161,1,12.0000),(55,1,163,1,1.0000),(56,1,164,1,6.0000),(57,1,165,3,5.0000),(58,1,167,3,10.0000),(59,1,170,2,6.0000),(60,1,174,1,5.0000);
/*!40000 ALTER TABLE `detalle_venta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estado`
--

DROP TABLE IF EXISTS `estado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estado` (
  `id_estado` int NOT NULL AUTO_INCREMENT,
  `nb_estado` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estado`
--

LOCK TABLES `estado` WRITE;
/*!40000 ALTER TABLE `estado` DISABLE KEYS */;
INSERT INTO `estado` VALUES (1,'Activo'),(2,'Inactivo');
/*!40000 ALTER TABLE `estado` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estado_compra`
--

DROP TABLE IF EXISTS `estado_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estado_compra` (
  `id_estado_compra` int NOT NULL AUTO_INCREMENT,
  `nb_estado_compra` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado_compra`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estado_compra`
--

LOCK TABLES `estado_compra` WRITE;
/*!40000 ALTER TABLE `estado_compra` DISABLE KEYS */;
INSERT INTO `estado_compra` VALUES (1,'PAGADA'),(2,'PENDIENTE');
/*!40000 ALTER TABLE `estado_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `factura_proveedor`
--

DROP TABLE IF EXISTS `factura_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura_proveedor` (
  `id_factura_proveedor` int NOT NULL AUTO_INCREMENT,
  `id_proveedor` int NOT NULL,
  `id_compra` int NOT NULL,
  `monto_deuda` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL DEFAULT '0.0000',
  `fecha_recibida` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_finalizacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_factura_proveedor`),
  KEY `id_proveedor` (`id_proveedor`),
  KEY `id_compra` (`id_compra`),
  CONSTRAINT `factura_proveedor_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor` (`id_proveedor`),
  CONSTRAINT `factura_proveedor_ibfk_2` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factura_proveedor`
--

LOCK TABLES `factura_proveedor` WRITE;
/*!40000 ALTER TABLE `factura_proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `factura_proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gasto_variable`
--

DROP TABLE IF EXISTS `gasto_variable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gasto_variable` (
  `id_gasto_variable` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `id_tipo_gasto_variable` int DEFAULT NULL,
  `id_metodo_pago` int DEFAULT NULL,
  `monto_usd` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(10,2) DEFAULT NULL,
  `fecha_gasto_variable` datetime DEFAULT NULL,
  PRIMARY KEY (`id_gasto_variable`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_tipo_gasto_variable` (`id_tipo_gasto_variable`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `gasto_variable_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `gasto_variable_ibfk_2` FOREIGN KEY (`id_tipo_gasto_variable`) REFERENCES `tipo_gasto_variable` (`id_tipo_gasto_variable`),
  CONSTRAINT `gasto_variable_ibfk_3` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gasto_variable`
--

LOCK TABLES `gasto_variable` WRITE;
/*!40000 ALTER TABLE `gasto_variable` DISABLE KEYS */;
/*!40000 ALTER TABLE `gasto_variable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metodo_pago`
--

DROP TABLE IF EXISTS `metodo_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metodo_pago` (
  `id_metodo_pago` int NOT NULL AUTO_INCREMENT,
  `nb_metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `saldo_inicial` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_metodo_pago`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metodo_pago`
--

LOCK TABLES `metodo_pago` WRITE;
/*!40000 ALTER TABLE `metodo_pago` DISABLE KEYS */;
INSERT INTO `metodo_pago` VALUES (1,'DIVISAS',449.00),(2,'PAGO MÓVIL',43451.87),(3,'PUNTO DE VENTA',142397.95),(4,'EFECTIVO',0.00),(5,'TRANSFERENCIA',0.00),(6,'MIXTO',0.00),(7,'ZELLE',587.83);
/*!40000 ALTER TABLE `metodo_pago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago`
--

DROP TABLE IF EXISTS `pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_detalle_venta` int DEFAULT NULL,
  PRIMARY KEY (`id_pago`),
  KEY `fk_pago_detalle` (`id_detalle_venta`),
  CONSTRAINT `fk_pago_detalle` FOREIGN KEY (`id_detalle_venta`) REFERENCES `detalle_venta` (`id_detalle_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago`
--

LOCK TABLES `pago` WRITE;
/*!40000 ALTER TABLE `pago` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_comision`
--

DROP TABLE IF EXISTS `pago_comision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_comision` (
  `id_pago_comision` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `nb_beneficiario` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_metodo_pago` int DEFAULT NULL,
  `monto_usd` decimal(10,2) DEFAULT NULL,
  `tasa_dia` decimal(10,2) DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `mes_referencia` int DEFAULT NULL,
  `ano_referencia` int DEFAULT NULL,
  PRIMARY KEY (`id_pago_comision`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `pago_comision_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `pago_comision_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_comision`
--

LOCK TABLES `pago_comision` WRITE;
/*!40000 ALTER TABLE `pago_comision` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_comision` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_compra`
--

DROP TABLE IF EXISTS `pago_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_compra` (
  `id_pago_compra` int NOT NULL AUTO_INCREMENT,
  `id_compra` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago_compra`),
  KEY `id_compra` (`id_compra`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `pago_compra_ibfk_1` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`),
  CONSTRAINT `pago_compra_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_compra`
--

LOCK TABLES `pago_compra` WRITE;
/*!40000 ALTER TABLE `pago_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_factura_proveedor`
--

DROP TABLE IF EXISTS `pago_factura_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_factura_proveedor` (
  `id_pago_factura_proveedor` int NOT NULL AUTO_INCREMENT,
  `id_factura_proveedor` int NOT NULL,
  `id_usuario` int NOT NULL DEFAULT '1',
  `id_metodo_pago` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago_factura_proveedor`),
  KEY `id_factura_proveedor` (`id_factura_proveedor`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  KEY `fk_pago_factura_usuario` (`id_usuario`),
  CONSTRAINT `fk_pago_factura_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `pago_factura_proveedor_ibfk_1` FOREIGN KEY (`id_factura_proveedor`) REFERENCES `factura_proveedor` (`id_factura_proveedor`),
  CONSTRAINT `pago_factura_proveedor_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_factura_proveedor`
--

LOCK TABLES `pago_factura_proveedor` WRITE;
/*!40000 ALTER TABLE `pago_factura_proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_factura_proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_fijo`
--

DROP TABLE IF EXISTS `pago_fijo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_fijo` (
  `id_pago_fijo` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_tipo_pago_fijo` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_pago_fijo` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago_fijo`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_tipo_pago_fijo` (`id_tipo_pago_fijo`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `pago_fijo_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `pago_fijo_ibfk_2` FOREIGN KEY (`id_tipo_pago_fijo`) REFERENCES `tipo_pago_fijo` (`id_tipo_pago_fijo`),
  CONSTRAINT `pago_fijo_ibfk_3` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_fijo`
--

LOCK TABLES `pago_fijo` WRITE;
/*!40000 ALTER TABLE `pago_fijo` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_fijo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_prestamo`
--

DROP TABLE IF EXISTS `pago_prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_prestamo` (
  `id_pago_prestamo` int NOT NULL AUTO_INCREMENT,
  `id_prestamo` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago_prestamo`),
  KEY `id_prestamo` (`id_prestamo`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `pago_prestamo_ibfk_1` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamo` (`id_prestamo`),
  CONSTRAINT `pago_prestamo_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_prestamo`
--

LOCK TABLES `pago_prestamo` WRITE;
/*!40000 ALTER TABLE `pago_prestamo` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamo`
--

DROP TABLE IF EXISTS `prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prestamo` (
  `id_prestamo` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `monto_prestamo` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_prestamo` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_prestamo`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `prestamo_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `prestamo_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamo`
--

LOCK TABLES `prestamo` WRITE;
/*!40000 ALTER TABLE `prestamo` DISABLE KEYS */;
/*!40000 ALTER TABLE `prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `producto`
--

DROP TABLE IF EXISTS `producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nb_producto` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_de_barra` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` decimal(14,4) NOT NULL,
  `id_categoria` int DEFAULT NULL,
  `id_estado` int NOT NULL,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `codigo_de_barra` (`codigo_de_barra`),
  KEY `id_estado` (`id_estado`),
  KEY `fk_producto_categoria` (`id_categoria`),
  CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id_categoria`),
  CONSTRAINT `producto_ibfk_1` FOREIGN KEY (`id_estado`) REFERENCES `estado` (`id_estado`)
) ENGINE=InnoDB AUTO_INCREMENT=179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producto`
--

LOCK TABLES `producto` WRITE;
/*!40000 ALTER TABLE `producto` DISABLE KEYS */;
INSERT INTO `producto` VALUES (1,'ANGELA  (ROPA VARIADA SEGUNDA)','SYS-1772396480310-0',12.0000,8,1),(2,'BARU10','SYS-1772396480318-1',10.0000,9,1),(3,'BARU4','SYS-1772396480325-2',4.0000,9,1),(4,'BERMUDA P/CABALLERO EXP AZL-2155','SYS-1772396480330-3',8.0000,2,1),(5,'BERMUDAS CAB PESQUERO PLAYERO','SYS-1772396480337-4',8.0000,2,1),(6,'BIKINI ALGODON P/DAMA DANIA PRYNIL 19','SYS-1772396480341-5',2.0000,1,1),(7,'BIKINI NIRVANA','SYS-1772396480346-6',2.0000,1,1),(8,'BLUSA P/DAMA  ALBY BLFJ-084','SYS-1772396480352-7',6.0000,1,1),(9,'BLUSA P/DAMA M/C  ALBY BLFJ-049 / BLFJ-061','SYS-1772396480358-8',6.0000,1,1),(10,'BLUSA P/DAMA M/L  ALBY BLFJ-049 / BLFJ-062','SYS-1772396480364-9',6.0000,1,1),(11,'BLUSAS /DAMA CROP TOP DE PERLA','SYS-1772396480371-10',14.0000,1,1),(12,'BLUSAS /P/DAMA LBL15, LBL13','SYS-1772396480375-11',6.0000,1,1),(13,'BLUSAS 3/4 P/DAMA','SYS-1772396480381-12',8.0000,1,1),(14,'BLUSAS CIERRE P/DAMA','SYS-1772396480385-13',7.0000,1,1),(15,'BLUSAS CIERRE P/DAMA TALLA PLUS','SYS-1772396480389-14',8.0000,1,1),(16,'BLUSAS DAMA RAYON COLONUT REPUBLIC','SYS-1772396480393-15',3.0000,1,1),(17,'BLUSAS P/DAMA','SYS-1772396480399-16',7.0000,1,1),(18,'BLUSAS P/DAMA BW686, BW673, BW59','SYS-1772396480403-17',6.0000,1,1),(19,'BLUSAS P/DAMA DOBLE','SYS-1772396480410-18',8.0000,1,1),(20,'BLUSAS P/DAMA SIN MANGA','SYS-1772396480414-19',6.0000,1,1),(21,'BLUSAS SEÑORIAL 20270','SYS-1772396480419-20',12.0000,1,1),(22,'BLUSAS SEÑORIAL DONNA SECRET','SYS-1772396480423-21',5.0000,1,1),(23,'BOXER CABALLERO CALVIN KLEIN','SYS-1772396480428-22',6.0000,2,1),(24,'BOXER CALVIN KLEY P/CABALLERO','SYS-1772396480434-23',6.0000,2,1),(25,'BOXER JUVENIL MARRISON','SYS-1772396480442-24',3.0000,3,1),(26,'BOXER PATRIOT P/NIÑO','SYS-1772396480449-25',3.0000,3,1),(27,'CAMISA AZUL ESCOLAR AMIGO SCHOOL','SYS-1772396480453-26',10.0000,6,1),(28,'CAMISA BEIGE ESCOLAR TEXAS SCHOOL','SYS-1772396480458-27',10.0000,6,1),(29,'CAMISA BLANCA ESCOLAR TEXAS SCHOOL','SYS-1772396480461-28',8.0000,6,1),(30,'CAMISAS BLANCAS ESCOLARES','SYS-1772396480465-29',8.0000,6,1),(31,'CAMISAS CABALLERO TOMMY HILFIGER','SYS-1772396480469-30',16.0000,2,1),(32,'CAMISAS P/CABALLERO','SYS-1772396480473-31',12.0000,2,1),(33,'CAMISAS P/CABALLERO ISSY','SYS-1772396480477-32',5.0000,2,1),(34,'CAMISAS P/NIÑO BOSS TOMMY','SYS-1772396480481-33',15.0000,3,1),(35,'CAMISAS P/NIÑO ISSY','SYS-1772396480485-34',5.0000,3,1),(36,'CAMISETA OLIMPICA CELESTIAL','SYS-1772396480489-35',3.0000,2,1),(37,'CAMISETA P/DAMA TIRA','SYS-1772396480493-36',4.0000,1,1),(38,'CAMISETAS P/DAMA GIA AVELLA','SYS-1772396480497-37',8.0000,1,1),(39,'CELESTE (ROPA VARIADA DE SEGUNDA)','SYS-1772396480505-38',10.0000,8,1),(40,'CHEMIS AZUL NIÑO','SYS-1772396480511-39',6.0000,6,1),(41,'CHEMIS AZUL TIPO PRINCESA NIÑA MENINA','SYS-1772396480515-40',6.0000,6,1),(42,'CHEMIS BEIGE TIPO PRINCESA NIÑA MENINA','SYS-1772396480519-41',7.0000,6,1),(43,'CHEMIS BLANCA TIPO PRINCESA NIÑA PANDITA','SYS-1772396480523-42',6.0000,6,1),(44,'CHEMIS ROJA TIPO PRINCESA NIÑA PANDITA','SYS-1772396480530-43',5.0000,6,1),(45,'CHEMISES AMARILLA NIÑO TEXAS','SYS-1772396480534-44',5.0000,6,1),(46,'CHEMISES CABALLERO COLVEN','SYS-1772396480538-45',7.0000,2,1),(47,'CHEMISES NIÑOS LACOSTE-TOMMY  UNICOLOR','SYS-1772396480544-46',7.0000,3,1),(48,'CHEMISES P/DAMA EXP FUL-13391','SYS-1772396480548-47',10.0000,1,1),(49,'DANIELA (ROPA VARIADA SEGUNDA)','SYS-1772396480554-48',8.0000,8,1),(50,'FALDA SHORT ESCOLAR','SYS-1772396480560-49',10.0000,6,1),(51,'FLORENCIA (ZAPATO USADO)','SYS-1772396480565-50',5.0000,10,1),(52,'FRANCA (ROPA VARIADA SEGUNDA)','SYS-1772396480570-51',5.0000,8,1),(53,'FRANELA BLANCA CABALLERO','SYS-1772396480578-52',4.0000,6,1),(54,'FRANELA BLANCA NIÑO Y JUVENIL PANDITA','SYS-1772396480584-53',4.0000,6,1),(55,'FRANELA CAB 5 MARCAS INCLUYE LA LEVIS','SYS-1772396480589-54',10.0000,2,1),(56,'FRANELA COMIQUITAS DAMA KIVENST','SYS-1772396480593-55',4.0000,1,1),(57,'FRANELA ESTAMPADA DAMA NIKE','SYS-1772396480597-56',6.0000,1,1),(58,'FRANELA NIÑO AMARILLA ESCOLAR','SYS-1772396480601-57',4.0000,6,1),(59,'FRANELA NIÑO AZUL ESCOLAR','SYS-1772396480605-58',4.0000,6,1),(60,'FRANELA P/ NIÑO PAT PAT AVELLA','SYS-1772396480609-59',6.0000,3,1),(61,'FRANELA P/CABALLERO','SYS-1772396480616-60',10.0000,2,1),(62,'FRANELA P/CABALLERO 03048','SYS-1772396480621-61',7.0000,2,1),(63,'FRANELA P/CABALLERO ADIDAS Y NINE','SYS-1772396480628-62',15.0000,2,1),(64,'FRANELAS CABALLERO DE MARCAS','SYS-1772396480632-63',10.0000,2,1),(65,'FRANELILLA BLANCA P/CABALLERO POTENZA VTP-01','SYS-1772396480638-64',5.0000,2,1),(66,'FRANELILLA CAB BLANCA ESCOLAR PANDA TALLA S-XL','SYS-1772396480644-65',4.0000,6,1),(67,'FRANELILLA MANGASIZA DAMA COLORES JARGET','SYS-1772396480649-66',5.0000,1,1),(68,'FRANELILLA NIÑO BLANCA ESCOLAR PANDA TALLA 4-16','SYS-1772396480652-67',4.0000,6,1),(69,'FRANELILLAS CAB BODY GLOVE','SYS-1772396480657-68',5.0000,2,1),(70,'FRANELILLAS NIÑOS BODY GLOVE','SYS-1772396480663-69',4.0000,3,1),(71,'GORRAS DE MARCAS','SYS-1772396480669-70',8.0000,2,1),(72,'HUGO (CAMISAS CABALLERO)','SYS-1772396480673-71',16.0000,2,1),(73,'JOGGER P/CABALLERO CARGO','SYS-1772396480677-72',15.0000,2,1),(74,'JOGGER P/DAMA MARCELLA HM-959-968','SYS-1772396480681-73',14.0000,1,1),(75,'JOGGER P/NIÑO EXP HM-969-978','SYS-1772396480685-74',10.0000,3,1),(76,'JOGGER PIJAMA P/DAMA MARCELLA FNL-13414','SYS-1772396480687-75',5.0000,1,1),(77,'LEGGINDE MALLA LADY AMIGA','SYS-1772396480692-76',6.0000,1,1),(78,'LEGGINS DAMA CON CHANEL','SYS-1772396480697-77',6.0000,1,1),(79,'LEGGINS DAMA CON HUECOS','SYS-1772396480701-78',4.0000,1,1),(80,'LEGGINS DAMA CON PAVOREAL','SYS-1772396480705-79',4.0000,1,1),(81,'LEGGINS DAMA DAY FASHION','SYS-1772396480710-80',4.0000,1,1),(82,'LEGGINS DAMA PERLAS','SYS-1772396480714-81',8.0000,1,1),(83,'LEGGINS NIÑAS SURTIDOS SHAKIRA','SYS-1772396480718-82',5.0000,4,1),(84,'LILA (ROPA VARIADA SEGUNDA)','SYS-1772396480723-83',15.0000,8,1),(85,'MAGIC (ZAPATO NUEVO Y USADO)','SYS-1772396480727-84',10.0000,10,1),(86,'MEDIA COLEGIAL AZUL','SYS-1772396480732-85',1.0000,6,1),(87,'MEDIA COLEGIAL BLANCA','SYS-1772396480741-86',1.0000,6,1),(88,'MEDIA COLEGIAL BLANCA NIÑO','SYS-1772396480747-87',1.0000,6,1),(89,'MEDIA DE NIÑA BEBE COTTON RICH','SYS-1772396480753-88',1.5000,7,1),(90,'MEDIA DE VESTIR CAB TRIPA X3 TEXAS BASIC','SYS-1772396480757-89',3.0000,7,1),(91,'MEDIA P/CABALLERO VESTIR','SYS-1772396480761-90',1.0000,7,1),(92,'MEDIA P/CABALLERO Y DAMA 1013','SYS-1772396480767-91',1.0000,7,1),(93,'MEDIA TOBILLERA DAMA ZUOZHI','SYS-1772396480771-92',1.5000,7,1),(94,'MEDIA VESTIR CAB TRIPACK','SYS-1772396480773-93',3.0000,7,1),(95,'MEDIAS ADIDAS DAMA','SYS-1772396480779-94',2.0000,7,1),(96,'MEDIAS BLANCAS COLEGIAL TERKO','SYS-1772396480784-95',1.0000,7,1),(97,'MEDIAS BLANCAS ESCOLARES FASHION SOCKS','SYS-1772396480788-96',1.5000,6,1),(98,'MEDIAS ESTAMPADAS NIÑOS TITOS','SYS-1772396480792-97',1.0000,7,1),(99,'MEDIAS LARGAS COTTON RICH DAMA','SYS-1772396480796-98',1.0000,7,1),(100,'MEDIAS SURTIDAS DE NIÑO Y NIÑA','SYS-1772396480800-99',1.0000,7,1),(101,'MEDIAS TITOS NIÑOS','SYS-1772396480803-100',2.0000,7,1),(102,'MEDIAS XIAOLUREN NIÑOS','SYS-1772396480809-101',2.0000,7,1),(103,'MONO CABALLERO TALLA S AL XL PANDA','SYS-1772396480814-102',7.0000,6,1),(104,'MONO ESCOLAR JUVENIL AZUL  PANDA TALLA 10 AL 18','SYS-1772396480818-103',6.0000,6,1),(105,'MONO ESCOLAR TEXAS NIÑO','SYS-1772396480822-104',7.0000,6,1),(106,'MONO NIÑO TALLA 2 AL 8 PANDA','SYS-1772396480826-105',5.0000,6,1),(107,'MONO P/NIÑO PAT PAT AVELLA','SYS-1772396480828-106',6.0000,3,1),(108,'MONO PIJAMA P/DAMA HOT LOVE','SYS-1772396480834-107',5.0000,1,1),(109,'MONO PIJAMA P/DAMA LOVELY FLZ-1516','SYS-1772396480838-108',6.0000,1,1),(110,'NINA (ROPA VARIADA SEGUNDA)','SYS-1772396480844-109',1.0000,8,1),(111,'PAJAMA P/NIÑA NDT13, NDT16, 1524,2114','SYS-1772396480850-110',6.0000,4,1),(112,'PALAZO P/DAMA ACANALADO','SYS-1772396480856-111',8.0000,1,1),(113,'PALAZO P/DAMA EST ANDREA 003A','SYS-1772396480862-112',8.0000,1,1),(114,'PALAZO P/DAMA EST ANDREA PPR01-004A','SYS-1772396480868-113',8.0000,1,1),(115,'PALAZO P/DAMA EST MARCELLA FM-34990','SYS-1772396480872-114',8.0000,1,1),(116,'PALAZO P/DAMA EST MOROCHAS YW-009-02','SYS-1772396480947-115',8.0000,1,1),(117,'PALAZO P/DAMA GAMUZADO MOROCHAS PP20-FLC-MOR','SYS-1772396480977-116',12.0000,1,1),(118,'PALAZO P/DAMA PIEDRA MOROCHAS','SYS-1772396480981-117',12.0000,1,1),(119,'PALAZO P/DAMA SENSUAL SH-122','SYS-1772396480987-118',8.0000,1,1),(120,'PALAZO P/DAMA TIPO JEANS LOVELY JR-01','SYS-1772396480992-119',10.0000,1,1),(121,'PANTALON COLEGIAL CABALLERO CON PINZA','SYS-1772396480996-120',12.0000,6,1),(122,'PANTALON COLEGIAL CABALLERO SIN PINZA','SYS-1772396481000-121',12.0000,6,1),(123,'PANTALON DAMA PALACIO','SYS-1772396481004-122',8.0000,1,1),(124,'PANTALON DAMA PALAZOS UNICOLOR LADY AMINA','SYS-1772396481010-123',8.0000,1,1),(125,'PANTALON DRILL P/NIÑO T= 6-16','SYS-1772396481014-124',8.0000,3,1),(126,'PANTALON ESCOLAR CABALLERO PANDA','SYS-1772396481018-125',13.0000,6,1),(127,'PANTALON ESCOLAR NIÑA CON PINZAS Y SIN PINZAS','SYS-1772396481024-126',12.0000,6,1),(128,'PANTALON ESCOLAR NIÑO CON PINZAS Y SIN PINZAS','SYS-1772396481028-127',12.0000,6,1),(129,'PANTALON ESCOLAR NIÑO PANDITA','SYS-1772396481032-128',12.0000,6,1),(130,'PANTALON JEANS DAMA TAHARI','SYS-1772396481038-129',12.0000,1,1),(131,'PANTY AMARILLA P/DAMA','SYS-1772396481042-130',1.0000,1,1),(132,'PANTY LOVE UOKIN','SYS-1772396481048-131',2.0000,1,1),(133,'PANTY P/ DAMA DANIA COD. N071','SYS-1772396481053-132',2.0000,1,1),(134,'PANTY P/DAMA COLVEN COD. 639','SYS-1772396481057-133',2.0000,1,1),(135,'PANTY P/DAMA HILO SIN COSTURA LOVELY COD. 1105','SYS-1772396481061-134',2.0000,1,1),(136,'PAOLA (ROPA VARIADA SEGUNDA)','SYS-1772396481065-135',3.0000,8,1),(137,'PIJAMA CAPRI P/DAMA ALBY','SYS-1772396481071-136',6.0000,1,1),(138,'PIJAMA CAPRI P/DAMA MARCELLA 33832','SYS-1772396481076-137',6.0000,1,1),(139,'PIJAMA CONJUNTO SHORT LADY AMIGA','SYS-1772396481082-138',6.0000,1,1),(140,'PIJAMA SHORT P/DAMA LOVELY 0125','SYS-1772396481086-139',6.0000,1,1),(141,'SABRINA (ROPA VARIADA USADA)','SYS-1772396481088-140',7.0000,8,1),(142,'SARA (ROPA VARIADA SUGUNDA)','SYS-1772396481093-141',20.0000,8,1),(143,'SHORT CAB CARUSO PLAYERO','SYS-1772396481097-142',8.0000,2,1),(144,'SHORT CAB LEOTEX PLAYERO','SYS-1772396481101-143',8.0000,2,1),(145,'SHORT CAB SENADOR','SYS-1772396481105-144',6.0000,2,1),(146,'SHORT CABALLERO NIKE','SYS-1772396481109-145',12.0000,2,1),(147,'SHORT DAMA PIJAMA LA REINITA','SYS-1772396481113-146',2.0000,1,1),(148,'SHORT DAMA PLAYERO ESTAMPADO ELIA','SYS-1772396481117-147',3.0000,1,1),(149,'SHORT DE DAMA DANIA COD. 978','SYS-1772396481122-148',5.0000,1,1),(150,'SHORT FULBOT P/CABALLERO HM-702','SYS-1772396481128-149',6.0000,2,1),(151,'SHORT LICRA P/CABALLERO EXP 2002/2650','SYS-1772396481133-150',8.0000,2,1),(152,'SHORT LICRA P/NIÑO EXP 2002/2651','SYS-1772396481138-151',7.0000,3,1),(153,'SHORT P/CABALLERO GALLETA','SYS-1772396481143-152',10.0000,2,1),(154,'SHORT PALMERA P/CABALLERO','SYS-1772396481147-153',5.0000,2,1),(155,'SHORT PIJAMA P/DAMA MOROCHAS SHT-PJ-MOR','SYS-1772396481152-154',2.0000,1,1),(156,'SHORT PLAYERO P/DAMA','SYS-1772396481158-155',5.0000,1,1),(157,'SHORT SPORT P/CABALLERO','SYS-1772396481164-156',4.0000,2,1),(158,'SHORT SPORT P/NIÑO','SYS-1772396481168-157',4.0000,3,1),(159,'SHORT SURTIDOS SHEIN','SYS-1772396481172-158',3.0000,1,1),(160,'SUATER DEPORTIVO M/L P/DAMA AVELLA','SYS-1772396481176-159',14.0000,1,1),(161,'SUDADERA DEPORTIVA CIERRE P/DAMA AVELLA','SYS-1772396481180-160',12.0000,1,1),(162,'SUETER ESCOLAR NIÑO','SYS-1772396481187-161',12.0000,6,1),(163,'SUSTENES AMARILLO P/DAMA','SYS-1772396481191-162',1.0000,1,1),(164,'TOALLA P/NIÑO','SYS-1772396481198-163',6.0000,3,1),(165,'TOALLAS','SYS-1772396481204-164',5.0000,5,1),(166,'TOP P/DAMA GYM COLVEN COD. 1674','SYS-1772396481210-165',5.0000,1,1),(167,'TRAJE DE BAÑO P/DAMA AVELLA','SYS-1772396481214-166',10.0000,1,1),(168,'TRAJE DE BAÑO P/NIÑA AVELLA','SYS-1772396481220-167',10.0000,4,1),(169,'VELENTINA','SYS-1772396481223-168',4.0000,8,1),(170,'VESTIDOS JUVENIL NIÑA PAT PAT AVELLA','SYS-1772396481226-169',6.0000,4,1),(171,'ZAPATO (BOTAS) GAMUSAS','SYS-1772396481231-170',15.0000,10,1),(172,'ZAPATO BONDAIRES','SYS-1772396481237-171',25.0000,10,1),(173,'ZAPATO LUIS UIITON','SYS-1772396481241-172',25.0000,10,1),(174,'ZAPATO PATENTE GUESS','SYS-1772396481245-173',5.0000,10,1),(175,'ZAPATO USADO 2026','SYS-1772396481251-174',5.0000,10,1),(176,'ZAPATO VERDE CIRCUS NY','SYS-1772396481256-175',5.0000,10,1),(177,'ZAPATO WUAHHSIET','SYS-1772396481259-176',5.0000,10,1);
/*!40000 ALTER TABLE `producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedor`
--

DROP TABLE IF EXISTS `proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `nb_proveedor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedor`
--

LOCK TABLES `proveedor` WRITE;
/*!40000 ALTER TABLE `proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol`
--

DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nb_rol` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nb_rol` (`nb_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol`
--

LOCK TABLES `rol` WRITE;
/*!40000 ALTER TABLE `rol` DISABLE KEYS */;
INSERT INTO `rol` VALUES (1,'Administrador'),(2,'Gerente'),(3,'Vendedor');
/*!40000 ALTER TABLE `rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipo_gasto_variable`
--

DROP TABLE IF EXISTS `tipo_gasto_variable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_gasto_variable` (
  `id_tipo_gasto_variable` int NOT NULL AUTO_INCREMENT,
  `nb_gasto_variable` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_gasto_variable`),
  UNIQUE KEY `nb_gasto_variable` (`nb_gasto_variable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipo_gasto_variable`
--

LOCK TABLES `tipo_gasto_variable` WRITE;
/*!40000 ALTER TABLE `tipo_gasto_variable` DISABLE KEYS */;
/*!40000 ALTER TABLE `tipo_gasto_variable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipo_pago_fijo`
--

DROP TABLE IF EXISTS `tipo_pago_fijo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_pago_fijo` (
  `id_tipo_pago_fijo` int NOT NULL AUTO_INCREMENT,
  `nb_tipo_pago_fijo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_pago_fijo`),
  UNIQUE KEY `nb_tipo_pago_fijo` (`nb_tipo_pago_fijo`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipo_pago_fijo`
--

LOCK TABLES `tipo_pago_fijo` WRITE;
/*!40000 ALTER TABLE `tipo_pago_fijo` DISABLE KEYS */;
INSERT INTO `tipo_pago_fijo` VALUES (1,'ALQUILER'),(2,'ASEO'),(16,'BANAVIH'),(6,'CESTATIKET'),(7,'COMISION BANCARIA BCO PROVINCIAL'),(8,'COMISION PUNTO DE VENTA'),(15,'COMISIONES POR VENTA'),(9,'CORPOELEC'),(14,'ENCOMIENDA TRANSPORTE ESPINOZA'),(5,'IMPUESTOS SENIAT'),(4,'INTERNET FIBRA'),(17,'IVSS'),(3,'LUZ'),(10,'NOMINA'),(11,'PAGO GANANCIA POR VENTAS'),(12,'PATENTE'),(13,'TALONARIO DE FACTURAS');
/*!40000 ALTER TABLE `tipo_pago_fijo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `traspaso`
--

DROP TABLE IF EXISTS `traspaso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `traspaso` (
  `id_traspaso` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_metodo_origen` int NOT NULL,
  `id_metodo_destino` int NOT NULL,
  `monto` decimal(16,6) DEFAULT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  `fecha_traspaso` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_traspaso`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_metodo_origen` (`id_metodo_origen`),
  KEY `id_metodo_destino` (`id_metodo_destino`),
  CONSTRAINT `traspaso_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `traspaso_ibfk_2` FOREIGN KEY (`id_metodo_origen`) REFERENCES `metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `traspaso_ibfk_3` FOREIGN KEY (`id_metodo_destino`) REFERENCES `metodo_pago` (`id_metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `traspaso`
--

LOCK TABLES `traspaso` WRITE;
/*!40000 ALTER TABLE `traspaso` DISABLE KEYS */;
/*!40000 ALTER TABLE `traspaso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_rol` int NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'ALEJANDRO','VILLA','alejandrovilla2912@gmail.com','$2b$10$gFrbX67uioP8S5ZHhB/VQ.tZ46HTdQ3weKO1dspMrMe5o6kBAYI7i',1,'2026-03-01 15:34:46',1),(2,'GERENTE','MANIA','novedadesropamania1818@gmail.com','$2b$10$Tb.K10y/MQn.OzcscU7rEOEGUop3O2CPbHAIjPlvLsOHUyrRKRN6G',3,'2026-03-02 03:32:36',1);
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venta`
--

DROP TABLE IF EXISTS `venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venta` (
  `id_venta` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `fecha_venta` datetime DEFAULT CURRENT_TIMESTAMP,
  `tasa_dia` decimal(14,4) NOT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `venta_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venta`
--

LOCK TABLES `venta` WRITE;
/*!40000 ALTER TABLE `venta` DISABLE KEYS */;
INSERT INTO `venta` VALUES (1,1,'2025-01-01 00:00:00',1.0000);
/*!40000 ALTER TABLE `venta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venta_borrador`
--

DROP TABLE IF EXISTS `venta_borrador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venta_borrador` (
  `id_venta_borrador` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `datos_venta` json NOT NULL,
  `tasa_dia` decimal(14,4) NOT NULL,
  PRIMARY KEY (`id_venta_borrador`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `venta_borrador_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venta_borrador`
--

LOCK TABLES `venta_borrador` WRITE;
/*!40000 ALTER TABLE `venta_borrador` DISABLE KEYS */;
INSERT INTO `venta_borrador` VALUES (22,1,'2026-03-01 19:25:06','[]',419.9900),(23,1,'2026-03-01 21:17:33','[]',419.9900),(24,1,'2026-03-01 21:43:17','[]',419.9900),(25,1,'2026-03-01 21:51:53','[]',419.9900),(26,1,'2026-03-01 21:51:55','[]',419.9900),(27,1,'2026-03-01 22:20:44','[]',419.9900),(28,1,'2026-03-01 22:32:20','[]',419.9900),(30,1,'2026-03-02 03:29:38','[]',419.9900),(31,2,'2026-03-02 03:33:07','[]',419.9900);
/*!40000 ALTER TABLE `venta_borrador` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-01 23:38:25

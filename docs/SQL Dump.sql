-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: colourbrain
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `answers`
--

DROP TABLE IF EXISTS `answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `answers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `color_ids` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` int unsigned NOT NULL,
  `turn_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `player_id_idx` (`player_id`),
  KEY `question_id_idx` (`question_id`),
  CONSTRAINT `player_id` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `answers`
--

LOCK TABLES `answers` WRITE;
/*!40000 ALTER TABLE `answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `colors`
--

DROP TABLE IF EXISTS `colors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hex_value` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `colors`
--

LOCK TABLES `colors` WRITE;
/*!40000 ALTER TABLE `colors` DISABLE KEYS */;
INSERT INTO `colors` VALUES (1,'Negro','#261a0e'),(2,'Gris','#9c9c9c'),(3,'Blanco','#f6f6f6'),(4,'Rojo','#e40d21'),(5,'Naranja','#ea9f32'),(6,'Amarillo','#e9e50e'),(7,'Verde','#79bc48'),(8,'Azul','#05bdda'),(9,'Morado','#a077be'),(10,'Rosa','#ed9db8'),(11,'Marrón','#ad5545');
/*!40000 ALTER TABLE `colors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `game_state`
--

DROP TABLE IF EXISTS `game_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_state` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `current_turn` int unsigned DEFAULT '0',
  `additional_points` int unsigned DEFAULT '0',
  `correct_answer_shown` tinyint(1) DEFAULT '0',
  `previous_points` json DEFAULT NULL,
  `phase` enum('idle','question','reveal','intermission') COLLATE utf8mb3_spanish_ci DEFAULT 'idle',
  `turn_end_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_state`
--

LOCK TABLES `game_state` WRITE;
/*!40000 ALTER TABLE `game_state` DISABLE KEYS */;
INSERT INTO `game_state` VALUES (1,1,1,1,'{}','reveal','2025-09-17 01:20:48');
/*!40000 ALTER TABLE `game_state` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (1,'Equipo 1: Nao y Skrik',0),(2,'Equipo 2: Kimmi y Barch',0),(3,'Equipo 3: Jota y Lucky',0),(4,'Equipo 4: Blanca y Moon',0);
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `correctColorIds` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asked` tinyint(1) DEFAULT '0',
  `turn_id` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` VALUES (1,'¿Qué color predomina en la bandera de China?','4',0,0),(2,'¿Qué colores hay en la bandera de Alemania?','1,4,6',1,1),(11,'Color de las estrellas más grandes','8',0,0),(15,'Luto en china','3',0,0),(16,'¿De qué color es el sudor de los hipopótamos?','10',0,0),(21,'Los lacasitos','3,4,5,6,7,8,11',0,0),(22,'Vestimenta icónica de Freddie Mercury','3,4,6',0,0),(23,'Color de la pokeball clásica','1,3,4',0,0),(26,'Color de los Power Rangers originales','1,4,6,7,8,10',0,0),(31,'Color de pelo más común del mundo','1',0,0),(37,'Bandera de Nepal','3,4,8',0,0),(39,'Colores de una salamandra','1,6',0,0),(41,'Colores de la vestimenta de Obelix','3,6,7,8',0,0),(42,'Colores de la cola de Pikachu','5,11',0,0),(43,'Colores de la vestimenta de la parte de arriba de Woody','1,3,4,6',0,0),(44,'Colores de la vestimenta de Hércules','6,8,11',0,0),(45,'Colores del símbolo de Google Drive','5,6,7,8',0,0),(46,'Colores de la bandera de Nepal','3,4,8',0,0),(47,'Colores primarios','4,7,8',0,0),(48,'Colores de Pegaso (caballo de Hércules)','1,3,8',0,0),(49,'Colores del mando de la nintendo 64','2,4,6,8',0,0),(50,'Colores de los lacasitos','3,4,5,6,7,8',0,0),(51,'Colores del logo actual de pepsi','3,4,8',0,0),(52,'Color de la gema del infinito de la realidad de Marvel','4',0,0),(53,'Colores del ojo de Sauron','1,4,5',0,0),(54,'Colores de los anillos de los juegos olímpicos','1,4,6,7,8',0,0),(55,'Color del planeta Neptuno','8',0,0),(56,'Colores del logo de Playstation de los años 90','4,6,7,8',0,0),(58,'Colores de las paradas de metro en Londres','4,8',0,0),(59,'Colores del logo de lego','1,3,4,6',0,0),(60,'Colores de Sonic','3,4,6,8',0,0),(61,'Colores del traje de Vegeta','3,6,8',0,0),(62,'Colores del logo de fanta','3,5,7,8',0,0);
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-17 12:44:00

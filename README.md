# DAREMON Radio ETS

**Het officiële bedrijfsradiostation DAREMON ETS** - Een moderne, interactieve web radio-applicatie met geavanceerde functies voor entertainment en bedrijfscommunicatie.

![DAREMON Radio](https://img.shields.io/badge/DAREMON-Radio%20ETS-008878?style=for-the-badge&logo=radio&logoColor=white)
![Version](https://img.shields.io/badge/Version-v10-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Enabled-green?style=for-the-badge)

## 🎵 Over het Project

DAREMON Radio ETS is een volledig uitgeruste web radio-applicatie ontworpen voor bedrijfscommunicatie en entertainment. De applicatie combineert moderne webtechnologieën met een intuïtieve gebruikerservaring, inclusief real-time interactie, meertalige ondersteuning en geavanceerd audiovisualisatie.

### ✨ Hoofdfuncties

- **🎧 Live Radio Stream** - Continue muziekstroom met automatische track-wisseling
- **💬 Real-time Interactie** - Berichten naar DJ's, song dedicaties en live feedback
- **🌍 Meertalige Ondersteuning** - Nederlands en Pools met automatische taaldetectie
- **📱 Progressive Web App (PWA)** - Installeerbaar op alle apparaten
- **🎨 Meerdere Thema's** - Verschillende visuele stijlen (Arburg, Engel, etc.)
- **📊 Audio Visualizer** - Real-time audio spectrum visualisatie
- **⭐ Like Systeem** - Interactieve track-beoordelingen
- **💾 Database Integratie** - MariaDB met localStorage fallback
- **📅 Planning Tools** - Machine-evacuatie kalender en project management
- **🔒 Beveiligde Toegang** - Wachtwoordbeveiliging voor gevoelige secties

## 🚀 Snelle Start

### Vereisten

- **Webserver** met PHP ondersteuning (Apache/Nginx)
- **MariaDB/MySQL** database (optioneel, localStorage fallback beschikbaar)
- **Modern browser** met JavaScript ondersteuning

### Basis Installatie

1. **Clone de repository:**
   ```bash
   git clone https://github.com/RudyKotJeKoc/radio.daremon.nl.git
   cd radio.daremon.nl
   ```

2. **Webserver configuratie:**
   ```bash
   # Voor Apache
   cp .htaccess.example .htaccess
   
   # Voor Nginx, voeg locatieblok toe aan server config
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

3. **Permissies instellen:**
   ```bash
   sudo chown -R www-data:www-data /path/to/radio.daremon.nl
   sudo chmod -R 755 /path/to/radio.daremon.nl
   ```

4. **Open in browser:**
   ```
   http://your-domain.com
   ```

## 🗃️ Database Setup (Optioneel)

Voor volledige functionaliteit wordt MariaDB aangeraden. Zie [DATABASE_SETUP.md](DATABASE_SETUP.md) voor gedetailleerde instructies.

### Snelle Database Setup

1. **Database aanmaken:**
   ```sql
   CREATE DATABASE daremon_radio;
   CREATE USER 'daremon_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON daremon_radio.* TO 'daremon_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Configuratie:**
   ```bash
   cp config.example.php config.php
   # Bewerk config.php met je database credentials
   ```

3. **Test de verbinding:**
   ```bash
   curl http://your-domain.com/api.php?action=messages
   ```

## 🛠️ Technische Architectuur

### Frontend
- **Vanilla JavaScript** - Geen frameworks, optimale performance
- **GSAP** - Geavanceerde animaties en visualisaties
- **CSS3** - Modern responsive design
- **Service Worker** - Offline ondersteuning en caching (v10)

### Backend
- **PHP** - RESTful API voor database operaties
- **MariaDB/MySQL** - Gestructureerde data opslag
- **localStorage** - Fallback voor offline werking

### PWA Functies
- **Manifest.json** - App-installatie ondersteuning
- **Service Worker** - Offline caching en updates
- **Responsive Design** - Optimaal op alle schermgroottes

## 📂 Project Structuur

```
radio.daremon.nl/
├── 📁 icons/                    # App icons en favicons
├── 📁 images/                   # Afbeeldingen en assets
├── 📁 locales/                  # Taalbestanden (nl.json, pl.json)
├── 📁 public/                   # Publieke assets
├── 📄 index.html               # Hoofd-applicatie
├── 📄 app.js                   # Kern JavaScript logica
├── 📄 sw.js                    # Service Worker (v10)
├── 📄 styles.css               # Hoofdstijlen
├── 📄 api.php                  # Backend API
├── 📄 config.example.php       # Database configuratie template
├── 📄 manifest.json            # PWA manifest
├── 📄 playlist.json            # Muziektracks data
├── 📄 project-management.html  # Project management tool
├── 📄 machine-planning.html    # Machine planning systeem
└── 📄 DATABASE_SETUP.md        # Database setup guide
```

## 🌐 Meertalige Ondersteuning

De applicatie ondersteunt automatische taaldetectie en handmatige taalwisseling:

- **🇳🇱 Nederlands** - Standaard taal
- **🇵🇱 Pools** - Volledige vertaling beschikbaar

Taalbestanden bevinden zich in `/locales/` en worden dynamisch geladen.

## 🎛️ Geavanceerde Functies

### Audio Management
- **Crossfading** - Naadloze overgangen tussen tracks
- **Volume Control** - Automatische volume-aanpassing voor stille uren
- **Audio Visualizer** - Real-time spectrum analyse
- **Preloading** - Intelligente track voorlading

### Interactiviteit
- **DJ Berichten** - Real-time communicatie met DJs
- **Song Dedicaties** - Persoonlijke muziekverzoeken
- **Like/Review Systeem** - Track-beoordelingen met persistentie
- **Golden Records** - Favoriete tracks collectie

### Planning Tools
- **Machine Planning** - Evacuatie en transport planning
- **Project Management** - Taakbeheer met deadlines
- **Kalender Integratie** - Event planning en reminders

## 🔧 Development

### Lokale Ontwikkeling

1. **Development server:**
   ```bash
   npm run dev
   # Of gebruik een lokale webserver zoals xampp/wamp
   ```

2. **Code linting:**
   ```bash
   npm run lint
   ```

3. **Build voor productie:**
   ```bash
   npm run build
   ```

### Hot Reloading
De Service Worker (v10) ondersteunt automatische cache-invalidatie bij updates.

## 🚀 Deployment

### Productie Deployment

1. **Upload bestanden** naar webserver
2. **Database setup** (indien gewenst)
3. **SSL certificaat** voor HTTPS
4. **Cache configuratie** voor optimale performance

### Performance Optimalisatie

- **Gzip compressie** inschakelen
- **Browser caching** configureren
- **CDN** voor statische assets
- **Database indexering** voor snellere queries

## 🐛 Troubleshooting

### Veel Voorkomende Problemen

**Audio speelt niet af:**
- Controleer browser autoplay beleid
- Gebruiker moet eerst interacteren met de pagina

**Database verbinding mislukt:**
- Controleer config.php credentials
- Verifieer MariaDB service status
- Applicatie valt terug op localStorage

**Service Worker problemen:**
- Force refresh (Ctrl+F5)
- Clear browser cache
- Check browser console voor errors

**Planning tools niet toegankelijk:**
- Controleer wachtwoord toegang
- Verifieer bestandspermissies

## 📝 Changelog

### v10 (Huidige Versie)
- ✅ Aggressieve cache cleanup voor zoekrobots
- ✅ Track switching bug opgelost
- ✅ MariaDB database integratie
- ✅ Verbeterde Service Worker performance
- ✅ Automatische fallback naar localStorage

### v8
- 🌍 Internationalisatie (i18n) toegevoegd
- 📅 Machine-evacuatie kalender
- 🔄 View switching tussen radio en kalender
- 🎨 Nieuwe thema ondersteuning

## 🤝 Bijdragen

Bijdragen zijn welkom! Voor major changes:

1. **Fork** het project
2. **Create feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit changes** (`git commit -m 'Add AmazingFeature'`)
4. **Push branch** (`git push origin feature/AmazingFeature`)
5. **Open Pull Request**

### Code Stijl
- Gebruik consistente indentatie (2 spaces)
- Commentaar in Nederlandse en Poolse context
- Volg bestaande naamgeving conventies

## 📄 Licentie

Dit project is ontwikkeld voor DAREMON ETS bedrijfsdoeleinden.

## 📞 Contact & Support

Voor ondersteuning en vragen:

1. **Check browser console** voor JavaScript errors
2. **Controleer PHP error logs** op de server
3. **Verifieer MariaDB status** en logs
4. **Controleer bestandspermissies**

Het systeem is ontworpen om robuust te zijn - zelfs bij database problemen blijft de website werken met localStorage backup.

---

**DAREMON Radio ETS** - *Waar technologie en entertainment samenkomen* 🎵✨
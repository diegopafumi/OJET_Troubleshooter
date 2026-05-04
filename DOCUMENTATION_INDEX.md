# 📚 OJET Troubleshooter - Documentation Index

Welcome to the OJET Troubleshooter documentation! This index will help you find the right documentation for your needs.

---

## 🚀 Getting Started (Start Here!)

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[README.md](README.md)** | Complete project overview and features | First time setup |
| **[INSTALLATION.md](INSTALLATION.md)** | Installation guide | Installing the application |

---

## 📖 Setup & Configuration

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[REMOTE_ACCESS.md](REMOTE_ACCESS.md)** | Access from remote machines | Setting up remote access |

---

## 📋 Release Information

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[RELEASE_NOTES.md](RELEASE_NOTES.md)** | Version history and changes | Checking what's new |

---

## 🎯 Feature Guides

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[OJET_QUERIES_GUIDE.md](OJET_QUERIES_GUIDE.md)** | Guide for 10 pre-configured Oracle queries | Using OJET Queries feature |
| **[MONITOR_GUIDE.md](MONITOR_GUIDE.md)** | Real-time OJET monitoring via Striim REST API | Using Monitor feature |

---

## 📋 Quick Reference

### Installation
```bash
cd OJET_Troubleshooter
chmod +x setup.sh
./setup.sh
```

### Start Application
```bash
./start.sh
```
**Note:** Runs in background and returns terminal control immediately.

### Stop Application
```bash
./stop.sh
```

### Restart Application
```bash
./restart.sh
```

### View Logs
```bash
tail -f logs/backend.log   # Backend logs
tail -f logs/frontend.log  # Frontend logs
```

### Access Application
- **Web Interface**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## 🎯 Application Features

### 1. OJET Validation PROD
- 6 automated validation checks
- Single database connection
- Automated corrective actions
- SQL query visibility

**Documentation**: See [README.md](README.md) - Section "Page: OJET Validation PROD"

### 2. OJET Validation Downstream
- 8 automated validation checks
- Dual database support (Primary + Downstream)
- Smart connection routing
- Persistent credentials
- Color-coded cards

**Documentation**: See [README.md](README.md) - Section "Page: OJET Validation Downstream"

### 3. OJET Troubleshooting
- Common problems and solutions
- Diagnostic commands
- Step-by-step guides
- SQL examples

**Documentation**: See [README.md](README.md) - Section "Page: OJET Troubleshooting"

### 4. Show Commands
- OJET command reference
- Organized by category
- Detailed field explanations
- Sample outputs
- Copy to clipboard

**Documentation**: See [README.md](README.md) - Section "Page: Show Commands"

### 5. Add/Remove Tables
- Step-by-step guides
- Table management procedures

**Documentation**: See [README.md](README.md) - Section "Page: Add/Remove Tables"

### 6. Monitor
- Real-time OJET source monitoring
- Striim REST API integration
- Integrated `mon` command with filtered metrics
- Formatted ASCII tables
- Persistent configuration

**Documentation**: See [MONITOR_GUIDE.md](MONITOR_GUIDE.md)

### 7. OJET Queries
- 10 pre-configured Oracle queries for OJET monitoring
- Color-coded health indicators
- Interactive column descriptions
- Session mapping for long-running transactions

**Documentation**: See [OJET_QUERIES_GUIDE.md](OJET_QUERIES_GUIDE.md)

---

## 🔍 Finding What You Need

### I want to...

**...install the application**
→ Read [INSTALLATION.md](INSTALLATION.md)

**...see what's new**
→ Read [RELEASE_NOTES.md](RELEASE_NOTES.md)

**...understand all features**
→ Read [README.md](README.md) - Section "Features"

**...validate downstream databases**
→ Read [README.md](README.md) - Section "Page: OJET Validation Downstream"

**...monitor OJET sources in real-time**
→ Read [MONITOR_GUIDE.md](MONITOR_GUIDE.md)

**...access from a remote machine**
→ Read [REMOTE_ACCESS.md](REMOTE_ACCESS.md)

**...execute Oracle queries for OJET monitoring**
→ Read [OJET_QUERIES_GUIDE.md](OJET_QUERIES_GUIDE.md)

**...start using the application quickly**
→ Read [README.md](README.md) - Section "Installation"

---

## 💡 Tips

1. **Start with README.md** for a complete overview
2. **INSTALLATION.md** has step-by-step installation instructions
3. **Feature-specific guides** provide detailed instructions for specific features
4. **All scripts** have built-in help messages

---

## 📞 Support

For issues or questions:
1. Check the relevant documentation above
2. Review the **Troubleshooting** section in [README.md](README.md)
3. Contact: Diego Pafumi - Striim Senior Field Engineer

---

**Ready to start?** → [INSTALLATION.md](INSTALLATION.md) 🚀


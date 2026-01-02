# Supported Programming Languages

CodeWithMe supports **25+ programming languages** with full syntax highlighting, code execution, and collaborative editing capabilities.

## Language Categories

### 🌐 Web Development
- **JavaScript** (Node.js 18) 🟨
- **TypeScript** (Node.js 18 + TypeScript) 🔷
- **PHP** (8.2) 🐘
- **Dart** (3.1) 🎯
- **HTML** (HTML5) 🌐
- **CSS** (CSS3) 🎨

### ⚙️ Systems Programming
- **Java** (OpenJDK 17) ☕
- **C#** (.NET 7.0) 🔷
- **C++** (GCC 12) ⚙️
- **C** (GCC 12) ⚙️
- **Go** (1.21) 🐹
- **Rust** (1.70) 🦀
- **Swift** (5.9) 🐦
- **Kotlin** (1.9) 🟣
- **Scala** (3.3) 🔴

### 📜 Scripting Languages
- **Python** (3.11) 🐍
- **Ruby** (3.2) 💎
- **Lua** (5.4) 🌙
- **Perl** (5.38) 🐪
- **Bash** (GNU Bash 5.2) 💻

### 🔷 Functional Programming
- **Haskell** (GHC 9.6) 🔷
- **Scala** (3.3) 🔴

### 📊 Data & Analytics
- **R** (4.3) 📊
- **SQL** (PostgreSQL 15) 🗄️
- **JSON** 📄
- **YAML** (1.2) 📝
- **XML** (1.0) 📋

## Language Features

Each language includes:
- ✅ Full syntax highlighting via Monaco Editor
- ✅ Code execution in isolated Docker containers
- ✅ Real-time collaborative editing
- ✅ Code completion and IntelliSense
- ✅ Error detection and diagnostics
- ✅ Multi-file support

## Code Execution

All languages run in secure, isolated Docker containers with:
- **Memory Limit**: 256MB per execution
- **CPU Limit**: 50% of available CPU
- **Network**: Disabled for security
- **Timeout**: 10 seconds (configurable)
- **Auto-cleanup**: Containers are automatically removed after execution

## Language-Specific Notes

### Compiled Languages
Languages like C, C++, Java, Rust, Swift, and Haskell are compiled before execution:
- Compilation errors are shown in the output
- Only successful compilations proceed to execution

### Interpreted Languages
Languages like Python, JavaScript, Ruby, and PHP run directly:
- Syntax errors are shown immediately
- Faster execution for quick iterations

### Special Cases

**TypeScript**: Requires compilation via `ts-node`
**Kotlin**: Compiled to JAR and executed with Java
**SQL**: Executed against PostgreSQL (read-only queries)
**HTML/CSS/XML**: Displayed as formatted text
**JSON/YAML**: Validated and pretty-printed

## Adding New Languages

To add support for a new language:

1. Add the language to `SupportedLanguage` type in `sandbox/src/types/index.ts`
2. Add Docker image to `supportedLanguages` in `sandbox/src/services/dockerService.ts`
3. Add language configuration in `getLanguageConfig()` function
4. Add metadata in `sandbox/src/services/languageService.ts`
5. Update Monaco language mapping if needed

## Language Icons & Colors

Each language has a unique icon and color for easy identification in the UI. Icons are displayed in the language selector dropdown.

## Performance

- **Fast Execution**: Most languages execute in < 1 second
- **Parallel Execution**: Multiple code runs can execute simultaneously
- **Resource Efficient**: Containers are reused when possible
- **Quick Cleanup**: Containers are removed immediately after execution

## Security

- All code runs in isolated Docker containers
- Network access is disabled
- Resource limits prevent abuse
- Timeout protection prevents infinite loops
- No access to host filesystem


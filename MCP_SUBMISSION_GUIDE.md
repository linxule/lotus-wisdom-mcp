# MCP Registry Submission Guide

## ✅ Status

Your `lotus-wisdom-mcp` server is now ready for MCP registry submission!

### Completed:
- ✅ NPM package published (v0.1.2)
- ✅ `mcpName` field added: `io.github.linxule/lotus-wisdom`
- ✅ `server.json` created with proper schema
- ✅ GitHub repository configured

## 📋 Next Steps

### Option 1: Using MCP Publisher CLI (Recommended)

1. **Install the Publisher Tool**
   ```bash
   # Using Homebrew (macOS/Linux)
   brew install mcp-publisher
   
   # OR download from releases
   curl -L "https://github.com/modelcontextprotocol/registry/releases/download/v1.0.0/mcp-publisher_1.0.0_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
   ```

2. **Authenticate with GitHub**
   ```bash
   mcp-publisher login github
   ```
   This will open your browser for OAuth authentication.

3. **Publish Your Server**
   ```bash
   mcp-publisher publish
   ```
   The tool will automatically detect your `server.json` and submit it to the registry.

### Option 2: Manual Pull Request

1. **Fork the Registry**
   - Go to https://github.com/modelcontextprotocol/registry
   - Click "Fork" in the top right

2. **Add Your Server**
   - Clone your fork locally
   - Add your server information to the appropriate location
   - Create a pull request

## 🔍 Verification

After submission, your server will be available at:
```
https://registry.modelcontextprotocol.io/servers/io.github.linxule/lotus-wisdom
```

## 📝 Server Details

- **Name**: `io.github.linxule/lotus-wisdom`
- **NPM Package**: `lotus-wisdom-mcp@0.1.2`
- **GitHub**: https://github.com/linxule/lotus-wisdom-mcp
- **Description**: A Model Context Protocol server implementing the Lotus Sutra's wisdom framework for problem-solving through multi-faceted understanding

## 💡 Tips

- The review process typically takes 1-3 business days
- Make sure your GitHub repository is public
- Keep your npm package up to date
- Consider adding more detailed documentation to your README

## 🚀 Future Updates

When you need to update your server:
1. Update your code
2. Bump the version in `package.json`
3. Update `server.json` with the new version
4. Run `npm publish` to update npm
5. Run `mcp-publisher publish` to update the registry

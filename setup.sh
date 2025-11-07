#!/bin/bash

# Portal UI - Quick Setup Script
# Automates the setup and deployment process

set -e

echo "=================================="
echo "Portal UI - Quick Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env.local"
    else
        cp .env.local.template .env.local
        echo -e "${GREEN}✅ Created new .env.local from template${NC}"
    fi
else
    cp .env.local.template .env.local
    echo -e "${GREEN}✅ Created .env.local from template${NC}"
fi

echo ""
echo "=================================="
echo "Configuration"
echo "=================================="
echo ""

# Get API URL
read -p "Portal API URL (default: http://localhost:5000): " API_URL
API_URL=${API_URL:-http://localhost:5000}
sed -i.bak "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$API_URL|" .env.local

echo -e "${GREEN}✅ Configured API URL: $API_URL${NC}"

# Get Activepieces URL
read -p "Activepieces URL (default: http://localhost:8080): " AP_URL
AP_URL=${AP_URL:-http://localhost:8080}
sed -i.bak "s|NEXT_PUBLIC_ACTIVEPIECES_URL=.*|NEXT_PUBLIC_ACTIVEPIECES_URL=$AP_URL|" .env.local

echo -e "${GREEN}✅ Configured Activepieces URL: $AP_URL${NC}"

# Remove backup files
rm -f .env.local.bak

echo ""
echo "=================================="
echo "Installation Method"
echo "=================================="
echo ""
echo "Choose installation method:"
echo "1) Docker Compose (Production)"
echo "2) Local Development (npm)"
echo ""
read -p "Enter choice (1 or 2): " INSTALL_METHOD

if [ "$INSTALL_METHOD" = "1" ]; then
    echo ""
    echo "=================================="
    echo "Docker Deployment"
    echo "=================================="
    echo ""
    
    # Check if docker-compose.yml exists in parent
    if [ ! -f ../docker-compose.yml ]; then
        echo -e "${RED}❌ docker-compose.yml not found in parent directory${NC}"
        echo "   Please ensure you're in the portal-ui directory"
        echo "   and the main docker-compose.yml exists in the parent"
        exit 1
    fi
    
    echo "Building Docker image..."
    docker-compose -f ../docker-compose.yml build portal-ui
    
    echo ""
    echo "Starting Portal UI..."
    docker-compose -f ../docker-compose.yml up -d portal-ui
    
    echo ""
    echo "Waiting for service to be healthy..."
    sleep 5
    
    # Check if service is running
    if docker-compose -f ../docker-compose.yml ps portal-ui | grep -q "Up"; then
        echo -e "${GREEN}✅ Portal UI is running!${NC}"
        echo ""
        echo "Access at: http://localhost:3002"
        echo ""
        echo "Useful commands:"
        echo "  - View logs: docker-compose logs -f portal-ui"
        echo "  - Stop: docker-compose stop portal-ui"
        echo "  - Restart: docker-compose restart portal-ui"
    else
        echo -e "${RED}❌ Failed to start Portal UI${NC}"
        echo "Check logs: docker-compose logs portal-ui"
        exit 1
    fi

elif [ "$INSTALL_METHOD" = "2" ]; then
    echo ""
    echo "=================================="
    echo "Local Development Setup"
    echo "=================================="
    echo ""
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo "   Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${YELLOW}⚠️  Node.js version is $NODE_VERSION. Version 20+ recommended.${NC}"
    else
        echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
    fi
    
    # Install dependencies
    echo ""
    echo "Installing dependencies..."
    npm install
    
    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo ""
    echo "To start development server:"
    echo "  npm run dev"
    echo ""
    echo "Then access at: http://localhost:3002"
    echo ""
    echo "Other commands:"
    echo "  - Build: npm run build"
    echo "  - Start production: npm run start"
    echo "  - Type check: npm run type-check"
    
else
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
fi

echo ""
echo "=================================="
echo "Setup Complete! 🎉"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Access the Portal UI at http://localhost:3002"
echo "2. Register a new account"
echo "3. Start creating workflows!"
echo ""
echo "Documentation:"
echo "  - README.md - Full documentation"
echo "  - DEPLOYMENT_GUIDE.md - Deployment instructions"
echo "  - IMPLEMENTATION_SUMMARY.md - Features overview"
echo ""

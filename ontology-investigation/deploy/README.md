# Deployment Guide - Ontology Investigation

## Architecture

```
Azure Container Apps Environment
├── ca-ontology-backend-{env}   (internal ingress, port 8000)
│   └── FastAPI + SQLite
└── ca-ontology-frontend-{env}  (external ingress, port 80)
    └── Nginx + React SPA → proxies /api to backend
```

## Prerequisites

1. **Azure CLI** installed and logged in (`az login`)
2. **Azure DevOps** project with a service connection to your Azure subscription
3. **Azure subscription** with permissions to create Container Apps, ACR

## Step 1: Create Azure Resources

Run the setup script once per environment:

```bash
cd deploy

# Dev environment (UK South)
./setup-azure.sh -e dev -l uksouth

# Prod environment
./setup-azure.sh -e prod -l uksouth
```

This creates:
- Resource Group: `rg-ontology-{env}`
- Container Registry: `ontology{env}acr`
- Container Apps Environment: `cae-ontology-{env}`
- Backend Container App: `ca-ontology-backend-{env}` (internal)
- Frontend Container App: `ca-ontology-frontend-{env}` (external)

## Step 2: Configure Azure DevOps

### Service Connection

1. Go to **Project Settings > Service connections**
2. Create a new **Azure Resource Manager** connection
3. Name it `azure-ontology`
4. Grant access to all pipelines

### Variable Groups

Create a variable group for each environment in **Pipelines > Library**:

**Group name:** `ontology-dev` (or `ontology-prod`)

| Variable | Value | Secret? |
|----------|-------|---------|
| `ACR_NAME` | `ontologydevacr` | No |
| `RESOURCE_GROUP` | `rg-ontology-dev` | No |
| `BACKEND_APP_NAME` | `ca-ontology-backend-dev` | No |
| `FRONTEND_APP_NAME` | `ca-ontology-frontend-dev` | No |
| `CONTAINER_ENV` | `cae-ontology-dev` | No |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **Yes** |
| `AI_PROVIDER` | `anthropic` (or `azure`) | No |
| `AI_MODEL` | *(optional, leave empty for default)* | No |

### Environments

Create environments in **Pipelines > Environments**:
- `ontology-dev` — auto-approve
- `ontology-prod` — add an approval gate

## Step 3: Create the Pipeline

1. Go to **Pipelines > New Pipeline**
2. Select your repo
3. Choose **Existing Azure Pipelines YAML file**
4. Path: `ontology-investigation/azure-pipelines.yml`
5. Save and run

## Pipeline Behavior

| Event | What happens |
|-------|-------------|
| Push to `master` (ontology-investigation/**) | Build + Deploy + Smoke Test |
| PR to `master` (ontology-investigation/**) | Build only (validates images compile) |
| Manual run | Choose `dev` or `prod` environment parameter |

## Secrets Management

The `ANTHROPIC_API_KEY` is stored as a secret variable in Azure DevOps and passed to the container app as a secret reference. The pipeline sets it via `secretref:anthropic-api-key`.

To add the secret to the Container App manually:

```bash
az containerapp secret set \
  --name ca-ontology-backend-dev \
  --resource-group rg-ontology-dev \
  --secrets "anthropic-api-key=<your-key>"
```

## Manual Deployment

If you need to deploy without the pipeline:

```bash
ACR_NAME=ontologydevacr
RESOURCE_GROUP=rg-ontology-dev

# Build and push
az acr build --registry $ACR_NAME --image backend-latest \
  --file backend/Dockerfile ./backend

az acr build --registry $ACR_NAME --image frontend-latest \
  --file frontend/Dockerfile.prod ./frontend

# Deploy
ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

az containerapp update \
  --name ca-ontology-backend-dev \
  --resource-group $RESOURCE_GROUP \
  --image "${ACR_SERVER}/backend-latest"

az containerapp update \
  --name ca-ontology-frontend-dev \
  --resource-group $RESOURCE_GROUP \
  --image "${ACR_SERVER}/frontend-latest"
```

## Troubleshooting

**View container logs:**
```bash
az containerapp logs show \
  --name ca-ontology-backend-dev \
  --resource-group rg-ontology-dev \
  --follow
```

**Check revision status:**
```bash
az containerapp revision list \
  --name ca-ontology-backend-dev \
  --resource-group rg-ontology-dev \
  -o table
```

**Restart an app:**
```bash
az containerapp revision restart \
  --name ca-ontology-backend-dev \
  --resource-group rg-ontology-dev \
  --revision <revision-name>
```

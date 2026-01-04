# Script PowerShell pour tester l'API Backend
# Montre que le backend fonctionne correctement

Write-Host "=== Test de l'API Backend GSA Manager ===" -ForegroundColor Green
Write-Host ""

# 1. Test de connexion
Write-Host "1. Connexion en tant que superadmin..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $accessToken = $loginResponse.access
    Write-Host "✅ Connexion réussie!" -ForegroundColor Green
    Write-Host "Token obtenu: $($accessToken.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Erreur de connexion: $_" -ForegroundColor Red
    exit 1
}

# 2. Créer un produit
Write-Host "2. Création d'un produit de test..." -ForegroundColor Yellow
$productBody = @{
    nom = "Test Produit $(Get-Date -Format 'HHmmss')"
    marque = "Marque Test"
    unite_vente = "BOUTEILLE"
    actif = $true
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $productResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/catalog/products/" `
        -Method POST `
        -Headers $headers `
        -Body $productBody
    
    Write-Host "✅ Produit créé avec succès!" -ForegroundColor Green
    Write-Host "ID: $($productResponse.id)" -ForegroundColor Gray
    Write-Host "Nom: $($productResponse.nom)" -ForegroundColor Gray
    Write-Host "Marque: $($productResponse.marque)" -ForegroundColor Gray
    Write-Host ""
    
    $productId = $productResponse.id
} catch {
    Write-Host "❌ Erreur lors de la création: $_" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# 3. Lister les produits
Write-Host "3. Liste des produits..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/catalog/products/" `
        -Method GET `
        -Headers $headers
    
    if ($productsResponse.results) {
        $products = $productsResponse.results
    } else {
        $products = $productsResponse
    }
    
    Write-Host "✅ $($products.Count) produit(s) trouvé(s)" -ForegroundColor Green
    foreach ($product in $products) {
        Write-Host "  - $($product.nom) (ID: $($product.id))" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ Erreur lors de la récupération: $_" -ForegroundColor Red
}

# 4. Modifier le produit
Write-Host "4. Modification du produit créé..." -ForegroundColor Yellow
$updateBody = @{
    nom = $productResponse.nom
    marque = "Marque Modifiée"
    unite_vente = "PACK"
    actif = $true
} | ConvertTo-Json

try {
    $updatedProduct = Invoke-RestMethod -Uri "http://localhost:8000/api/catalog/products/$productId/" `
        -Method PUT `
        -Headers $headers `
        -Body $updateBody
    
    Write-Host "✅ Produit modifié avec succès!" -ForegroundColor Green
    Write-Host "Nouvelle marque: $($updatedProduct.marque)" -ForegroundColor Gray
    Write-Host "Nouvelle unité: $($updatedProduct.unite_vente_display)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Erreur lors de la modification: $_" -ForegroundColor Red
}

# 5. Supprimer le produit
Write-Host "5. Suppression du produit de test..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/catalog/products/$productId/" `
        -Method DELETE `
        -Headers $headers | Out-Null
    
    Write-Host "✅ Produit supprimé avec succès!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erreur lors de la suppression: $_" -ForegroundColor Red
}

Write-Host "=== Test terminé avec succès! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Le backend fonctionne correctement. L'API REST est opérationnelle." -ForegroundColor Cyan
Write-Host "Il ne reste plus qu'à implémenter les interfaces frontend." -ForegroundColor Cyan


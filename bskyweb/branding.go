package bskyweb

import "embed"
import "os"
import "encoding/json"
import logging "github.com/ipfs/go-log"

//go:embed branding.json branding-bluesky.json
var BrandingFS embed.FS

type Branding struct {
	Code    map[string]interface{} `json:"code"`
	Naming  map[string]interface{} `json:"naming"`
	Styling struct {
	} `json:"styling"`
	Verbage map[string]interface{} `json:"verbage"`
}

// LoadBrandingWithFallback loads branding configuration with fallback chain:
// 1. External file from --branding flag (if exists)
// 2. Embedded branding.json
func LoadBrandingWithFallback(brandingFile string, log logging.EventLogger) Branding {
	var branding Branding

	// external file
	_, err := os.Stat(brandingFile)
	if err == nil {
		if brandingData, err := os.ReadFile(brandingFile); err == nil {
			if err := json.Unmarshal(brandingData, &branding); err == nil {
				log.Infof("Using branding file %s", brandingFile)
				return branding
			} else {
				log.Warnf("Failed to parse external branding file %s: %v", brandingFile, err)
			}
		}
	}

	// Try embedded branding.json
	if brandingData, err := BrandingFS.ReadFile("branding.json"); err == nil {
		if err := json.Unmarshal(brandingData, &branding); err == nil {
			log.Info("Using embedded branding")
			return branding
		}
		log.Warnf("Failed to parse embedded branding.json: %v", err)
		if brandingData, err := BrandingFS.ReadFile("branding-bluesky.json"); err == nil {
			if err := json.Unmarshal(brandingData, &branding); err == nil {
				log.Info("Using embedded bluesky branding")
				return branding
			}
			log.Warnf("Failed to parse embedded branding-bluesky.json: %v", err)
		}
	}

	log.Warnf("No branding configuration found, using empty defaults")
	return branding
}

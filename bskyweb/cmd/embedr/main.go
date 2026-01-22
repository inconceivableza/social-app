package main

import (
	"os"

	_ "github.com/joho/godotenv/autoload"

	logging "github.com/ipfs/go-log"
	"github.com/urfave/cli/v2"
)

var log = logging.Logger("embedr")

func init() {
	logging.SetAllLoggers(logging.LevelDebug)
	//logging.SetAllLoggers(logging.LevelWarn)
}

func main() {
	run(os.Args)
}

func run(args []string) {

	app := cli.App{
		Name:  "embedr",
		Usage: "web server for embed.bsky.app post embeds",
	}

	app.Commands = []*cli.Command{
		&cli.Command{
			Name:   "serve",
			Usage:  "run the server",
			Action: serve,
			Flags: []cli.Flag{
				&cli.StringFlag{
					Name:    "appview-host",
					Usage:   "method, hostname, and port of PDS instance",
					Value:   "https://public.api.bsky.app",
					EnvVars: []string{"ATP_PUBLIC_APPVIEW_URL", "ATP_APPVIEW_URL", "ATP_PDS_URL"},
				},
				&cli.StringFlag{
					Name:    "socialapp-name",
					Usage:   "human-readable name of social app",
					Value:   "Bluesky Social",
					EnvVars: []string{"SOCIAL_APP_NAME"},
				},
				&cli.StringFlag{
					Name:    "socialapp-url",
					Usage:   "method, hostname, and port of social app instance",
					Value:   "https://bsky.app",
					EnvVars: []string{"SOCIAL_APP_URL"},
				},
				&cli.StringFlag{
					Name:    "card-url",
					Usage:   "method, hostname, and port of the ogcard server",
					Value:   "https://ogcard.cdn.bsky.app",
					EnvVars: []string{"OGCARD_URL"},
				},
				&cli.StringFlag{
					Name:    "embed-url",
					Usage:   "method, hostname, and port of this embed instance",
					Value:   "https://embed.bsky.app",
					EnvVars: []string{"SOCIAL_EMBED_SERVICE"},
				},
				&cli.StringFlag{
					Name:    "link-url",
					Usage:   "method, hostname, and port of the link server",
					Value:   "https://go.bsky.app",
					EnvVars: []string{"LINK_URL"},
				},
				&cli.StringFlag{
					Name:    "support-email",
					Usage:   "email address for support",
					Value:   "support@bsky.app",
					EnvVars: []string{"SOCIAL_APP_SUPPORT_EMAIL"},
				},
				&cli.StringFlag{
					Name:    "security-email",
					Usage:   "email address for security",
					Value:   "security@bsky.app",
					EnvVars: []string{"SOCIAL_APP_SECURITY_EMAIL"},
				},
				&cli.StringFlag{
					Name:     "http-address",
					Usage:    "Specify the local IP/port to bind to",
					Required: false,
					Value:    ":8100",
					EnvVars:  []string{"HTTP_ADDRESS"},
				},
				&cli.StringFlag{
					Name:     "metrics-address",
					Usage:    "Specify the local IP/port to bind the metrics server to",
					Required: false,
					Value:    ":9090",
					EnvVars:  []string{"METRICS_HTTP_ADDRESS"},
				},
				&cli.BoolFlag{
					Name:     "debug",
					Usage:    "Enable debug mode",
					Value:    false,
					Required: false,
					EnvVars:  []string{"DEBUG"},
				},
				&cli.StringFlag{
					Name:     "branding",
					Usage:    "path to branding JSON file",
					Required: false,
					Value:    "branding.json",
					EnvVars:  []string{"BRANDING_FILE"},
				},
			},
		},
	}
	app.RunAndExitOnError()
}

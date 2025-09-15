package main

import (
	"html/template"
	"io"
	"strings"
	text_template "text/template"

	"github.com/labstack/echo/v4"
)

type Template struct {
	htmlTemplates *template.Template
	textTemplates *text_template.Template
}

func (t *Template) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	if strings.HasSuffix(name, ".js") {
		return t.textTemplates.ExecuteTemplate(w, name, data)
	}
	return t.htmlTemplates.ExecuteTemplate(w, name, data)
}

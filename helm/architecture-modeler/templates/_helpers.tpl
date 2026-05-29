{{/* Common labels und Naming */}}

{{- define "am.name" -}}
architecture-modeler
{{- end -}}

{{- define "am.fullname" -}}
{{ include "am.name" . }}
{{- end -}}

{{- define "am.labels" -}}
app.kubernetes.io/name: {{ include "am.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
sovaia.io/tenant: {{ .Values.tenant | quote }}
{{- end -}}

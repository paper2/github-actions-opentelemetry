#!/bin/bash

PROJECT_ID='<your-project-id>'
gcloud run deploy collector \
	--project=${PROJECT_ID} \
	--region=asia-northeast1 \
	--source . \
	--allow-unauthenticated \
	--port=4318

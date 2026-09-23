// =============================================================================
// ISEC6000 Assessment 2 - Declarative pipeline for the Node.js (Express) app
// Flow: Install -> Unit tests -> Dependency scan (SECURITY GATE) -> Docker build -> Docker push
// The gate sits BEFORE build/push, so an image with High/Critical dependency issues is never published.
// =============================================================================
pipeline {

    // No global agent: each stage chooses the environment it needs.
    agent none

    options {
        // Retention policy (Task 4.2a): keep the last 10 builds' logs, 5 builds' artefacts.
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        timestamps()                          // timestamp every log line (Timestamper plugin)
        timeout(time: 30, unit: 'MINUTES')    // a hung build can't block the CI forever
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME = 'ahnafifti/isec6000-a2-node-app'
        IMAGE_TAG  = "${env.BUILD_NUMBER}"    // immutable, traceable tag (no :latest)
        // Jenkins credential IDs (created in the UI - the secrets themselves never appear in Git):
        REGISTRY_CREDS = 'dockerhub-creds'    // Username with password (Docker Hub access token as the password)
        SNYK_CREDS     = 'snyk-token'         // Secret text
    }

    stages {

        // ---------------------------------------------------------------------
        // Stages 1-3 run inside a Node 16 container (the required build agent).
        // The container runs as Jenkins' non-root uid; HOME is redirected because
        // that uid has no home directory inside the image (npm needs a writable cache).
        // ---------------------------------------------------------------------
        stage('Node 16 CI') {
            agent {
                docker {
                    image 'node:16'
                    args  '-e HOME=/tmp'
                }
            }
            stages {

                stage('Install Dependencies') {
                    steps {
                        sh 'node --version && npm --version'
                        sh 'npm ci'                        // lockfile-exact, reproducible install
                    }
                }

                stage('Unit Tests') {
                    steps {
                        sh 'npm test'
                    }
                }

                stage('Dependency Vulnerability Scan') {
                    steps {
                        withCredentials([string(credentialsId: env.SNYK_CREDS, variable: 'SNYK_TOKEN')]) {
                            // --severity-threshold=high : exit code 1 (=> stage FAILS => pipeline stops) if any
                            //                             High or Critical issue is found; Low/Medium are reported only.
                            // --prod                    : scan runtime dependencies only (what actually ships in the image);
                            //                             dev tools like mocha never reach the container, so they're excluded.
                            sh 'npx --yes snyk test --prod --severity-threshold=high --json-file-output=snyk-report.json'
                        }
                    }
                    post {
                        always {
                            // Archive the evidence even when the gate fails.
                            archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Docker stages run on the Jenkins node, whose Docker CLI talks to the DinD daemon over TLS.
        // (The node:16 container above has no Docker CLI, hence the separate agent.)
        // These stages are skipped automatically if anything above failed - including the security gate.
        // ---------------------------------------------------------------------
        stage('Container') {
            agent any
            stages {

                stage('Docker Build') {
                    steps {
                        sh 'docker build -t "$IMAGE_NAME:$IMAGE_TAG" .'
                    }
                }

                stage('Docker Push') {
                    steps {
                        withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDS,
                                                          usernameVariable: 'REG_USER',
                                                          passwordVariable: 'REG_PASS')]) {
                            // Single-quoted so Groovy never interpolates the secret; --password-stdin keeps it
                            // off the command line (avoids the "-p is insecure" warning from Assessment 1).
                            sh '''
                                echo "$REG_PASS" | docker login -u "$REG_USER" --password-stdin
                                docker push "$IMAGE_NAME:$IMAGE_TAG"
                                docker image ls "$IMAGE_NAME" > docker-images.txt
                            '''
                        }
                    }
                    post {
                        always {
                            // docker login stores credentials in ~/.docker/config.json - remove them.
                            sh 'docker logout || true'
                            archiveArtifacts artifacts: 'docker-images.txt', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
    }

    post {
        success { echo "Pipeline OK - published ${env.IMAGE_NAME}:${env.IMAGE_TAG}" }
        failure { echo 'Pipeline FAILED - check which stage stopped it (test failure vs security gate).' }
    }
}

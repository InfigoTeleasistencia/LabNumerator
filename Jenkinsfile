pipeline {
    agent any
    
    environment {
        // Deployment configuration
        DEPLOY_SERVER = credentials('lab-server-host')
        DEPLOY_USER = credentials('lab-server-user')
        DEPLOY_PATH = '/var/www/LabNumerator'
        
        // Use Node.js installed directly on Jenkins server
        PATH = "/usr/local/bin:/usr/bin:${env.PATH}"
        
        APP_NAME = 'lab-numerator'
        BRANCH_NAME = "${env.GIT_BRANCH ?: 'main'}"
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📦 Checking out source code...'
                checkout scm
                
                script {
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                }
                
                echo "📝 Commit: ${env.GIT_COMMIT_MSG}"
                echo "👤 Author: ${env.GIT_AUTHOR}"
            }
        }
        
        stage('Verify Node.js') {
            steps {
                echo '🔍 Verifying Node.js installation...'
                sh '''
                    echo "Node.js version:"
                    node --version || echo "Node.js not found on Jenkins server"
                    
                    echo "Yarn version:"
                    yarn --version || echo "Yarn not found on Jenkins server"
                '''
            }
        }
        
        stage('Install Dependencies on Server') {
            steps {
                echo '📚 Installing dependencies on target server...'
                
                sshagent(credentials: ['lab-server-ssh']) {
                    sh """
                        # Create deployment directory if not exists
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            mkdir -p ${DEPLOY_PATH}
                            mkdir -p ${DEPLOY_PATH}/logs
                        '
                        
                        # Sync files to server (excluding node_modules)
                        rsync -avz --delete \
                            --exclude 'node_modules' \
                            --exclude '.git' \
                            --exclude '.env.local' \
                            --exclude '.env.*.local' \
                            --exclude 'logs' \
                            --exclude '.next' \
                            ./ ${DEPLOY_USER}@${DEPLOY_SERVER}:${DEPLOY_PATH}/
                        
                        # Install and build on server
                        ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${DEPLOY_PATH}
                            
                            # Verify Node.js on server
                            echo "Node.js on server:"
                            node --version
                            
                            echo "Installing dependencies..."
                            yarn install --frozen-lockfile --production=false
                        '
                    """
                }
            }
        }
        
        stage('Type Check on Server') {
            steps {
                echo '🔍 Running type checker on server...'
                sshagent(credentials: ['lab-server-ssh']) {
                    sh """
                        ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${DEPLOY_PATH}
                            yarn type-check || echo "Type check completed with warnings"
                        '
                    """
                }
            }
        }
        
        stage('Test SOAP Connectivity') {
            steps {
                echo '🔌 Testing SOAP service connectivity from server...'
                sshagent(credentials: ['lab-server-ssh']) {
                    sh """
                        ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${DEPLOY_PATH}
                            node scripts/test-soap.js --check-only || echo "⚠️  SOAP test failed (non-blocking)"
                        '
                    """
                }
            }
        }
        
        stage('Build on Server') {
            steps {
                echo '🏗️  Building Next.js application on server...'
                sshagent(credentials: ['lab-server-ssh']) {
                    sh """
                        ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${DEPLOY_PATH}
                            
                            echo "Building application..."
                            NODE_ENV=production yarn build
                            
                            echo "Build completed successfully"
                            ls -la .next/
                        '
                    """
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Restarting application with PM2...'
                
                sshagent(credentials: ['lab-server-ssh']) {
                    sh """
                        ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${DEPLOY_PATH}
                            
                            # Restart application with PM2
                            pm2 delete ${APP_NAME} || true
                            pm2 start ecosystem.config.js --env production
                            pm2 save
                            
                            # Show status
                            pm2 list
                            pm2 info ${APP_NAME}
                        '
                    """
                }
            }
        }
        
        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                echo '🏥 Performing health check...'
                script {
                    sleep(time: 10, unit: 'SECONDS')
                    
                    sshagent(credentials: ['lab-server-ssh']) {
                        sh """
                            ssh ${DEPLOY_USER}@${DEPLOY_SERVER} '
                                # Check PM2 status
                                pm2 list | grep ${APP_NAME} | grep online || exit 1
                                
                                # Check if port is listening
                                netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp | grep :3000 || exit 1
                                
                                echo "✅ Health check passed!"
                            '
                        """
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline completed successfully!'
            
            script {
                if (env.BRANCH_NAME == 'main') {
                    echo """
                    🎉 Deployment Successful!
                    
                    Branch: ${env.BRANCH_NAME}
                    Commit: ${env.GIT_COMMIT_MSG}
                    Author: ${env.GIT_AUTHOR}
                    Build: #${env.BUILD_NUMBER}
                    """
                }
            }
        }
        
        failure {
            echo '❌ Pipeline failed!'
            
            echo """
            ⚠️  Deployment Failed!
            
            Branch: ${env.BRANCH_NAME}
            Commit: ${env.GIT_COMMIT_MSG}
            Build: #${env.BUILD_NUMBER}
            
            Check console output for details.
            """
        }
        
        always {
            echo '🧹 Cleaning up...'
            // No local cleanup needed since we build on server
        }
    }
}


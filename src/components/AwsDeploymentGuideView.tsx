import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  FileCode,
  HelpCircle,
  Layers,
  PowerOff,
  Server,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';

export const AwsDeploymentGuideView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'terraform' | 'boto3' | 'teardown'>('architecture');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const terraformSnippet = `# Example only — place in a separately reviewed Terraform project
# CloudPilot AI - AWS Free-Tier Compatible Deployment
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC and Public Subnets
resource "aws_vpc" "cloudpilot_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "cloudpilot-vpc" }
}

# 2. Application Load Balancer
resource "aws_lb" "alb" {
  name               = "cloudpilot-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

# 3. Target Group
resource "aws_lb_target_group" "tg" {
  name     = "cloudpilot-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.cloudpilot_vpc.id

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# 4. Auto Scaling Group (Controlled by CloudPilot Orchestrator)
resource "aws_autoscaling_group" "asg" {
  name                = "cloudpilot-asg"
  max_size            = 10
  min_size            = 1
  desired_capacity    = 2
  target_group_arns   = [aws_lb_target_group.tg.arn]
  vpc_zone_identifier = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  launch_template {
    id      = aws_launch_template.app_template.id
    version = "$Latest"
  }
}`;

  const boto3Snippet = `# Example only — not wired into CloudPilot
"""
CloudPilot AI - Boto3 AWS AutoScaling Controller
This script queries CloudPilot's ML prediction endpoint and dynamically
adjusts AWS Auto Scaling Group desired capacity before traffic spikes arrive.
"""
import boto3
import requests
import time
import logging

logging.basicConfig(level=logging.INFO)
asg_client = boto3.client('autoscaling', region_name='us-east-1')

ASG_NAME = "cloudpilot-asg"
PREDICTION_API_URL = "http://localhost:8000/api/predict"

def execute_predictive_scaling():
    try:
        # Query CloudPilot ML engine for next 10-minute predicted load
        response = requests.get(PREDICTION_API_URL, timeout=5)
        data = response.json()
        
        predicted_rps = data.get("predicted_workload_10m", 250)
        instance_capacity = 250
        target_cpu = 0.70
        
        # Calculate target instances using CloudPilot equation:
        import math
        required_instances = max(1, math.ceil(predicted_rps / (instance_capacity * target_cpu)))
        
        logging.info(f"Forecast: {predicted_rps} RPS -> Setting AWS ASG to {required_instances} instances")
        
        # Proactively update AWS Auto Scaling Group capacity
        asg_client.set_desired_capacity(
            AutoScalingGroupName=ASG_NAME,
            DesiredCapacity=required_instances,
            HonorCooldown=True
        )
        logging.info("AWS ASG desired capacity updated successfully.")
    except Exception as e:
        logging.error(f"Error during predictive scaling cycle: {e}")

if __name__ == "__main__":
    while True:
        execute_predictive_scaling()
        time.sleep(60) # Evaluates every minute`;

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Cost Estimate Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">AWS Deployment Blueprint (Illustrative)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Illustrative Terraform/Boto3 examples for architecture discussion; this app does not connect to or provision AWS resources.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg shadow">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>No live AWS resources are created</span>
        </div>
      </div>

      <div role="note" className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100">
        <strong>Prototype limitation:</strong> The code snippets below are illustrative examples shown in this UI, not a checked-in or tested AWS deployment. CloudPilot does not call AWS APIs or create cloud resources. Review IAM permissions, networking, secrets, state, and expected charges before adapting any example; do not run it in production as-is.
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'architecture' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AWS Architecture Flow
        </button>
        <button
          onClick={() => setActiveTab('terraform')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'terraform' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terraform IaC (main.tf)
        </button>
        <button
          onClick={() => setActiveTab('boto3')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'boto3' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Boto3 ASG Daemon
        </button>
        <button
          onClick={() => setActiveTab('teardown')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'teardown' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-rose-400'
          }`}
        >
          Safe Teardown (Avoid Charges)
        </button>
      </div>

      {/* Tab 1: Architecture Diagram */}
      {activeTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>AWS Cloud Topology Diagram</span>
          </h2>

          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto space-y-2">
            <div className="text-cyan-400 font-bold">INTERNET CLIENTS &amp; TRAFFIC INGRESS:</div>
            <div>Public Internet ──▶ AWS Route 53 DNS ──▶ Application Load Balancer (ALB)</div>
            <div className="text-slate-600">                                                       │</div>
            <div className="text-slate-600">                                                       ▼</div>
            <div className="text-emerald-400 font-bold">AWS AUTO SCALING GROUP (EC2 t3.micro / ECS Fargate):</div>
            <div>[ EC2 Instance 1 ]   [ EC2 Instance 2 ]   [ EC2 Instance 3 (Booted via AI Forecast) ]</div>
            <div className="text-slate-600">         ▲                                             │</div>
            <div className="text-slate-600">         │                                             ▼</div>
            <div className="text-purple-400 font-bold">CLOUDPILOT PREDICTIVE DAEMON:</div>
            <div>Boto3 Daemon / AWS Lambda ◀── Pulls Metrics ◀── CloudWatch Telemetry API</div>
            <div>   │</div>
            <div>   └── Calculates: N = ceil(Predicted_Load / (Capacity * Target_CPU))</div>
            <div>   └── Calls: asg.set_desired_capacity(HonorCooldown=True)</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-200 block">1. Compute Layer</span>
              <p className="text-slate-400">AWS EC2 (t3.micro, eligible for 750 free hours/month) or AWS ECS Fargate.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-200 block">2. Ingress Load Balancer</span>
              <p className="text-slate-400">AWS Application Load Balancer with round-robin traffic routing and HTTP health checks.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-200 block">3. Orchestrator Integration</span>
              <p className="text-slate-400">Python Boto3 script running as an ECS sidecar or cron Lambda function.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Terraform IaC */}
      {activeTab === 'terraform' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Terraform Infrastructure as Code (aws/terraform/main.tf)</span>
            </h2>
            <button
              onClick={() => copyToClipboard(terraformSnippet, 'tf')}
              className="flex items-center space-x-1 px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              {copied === 'tf' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'tf' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto">
            {terraformSnippet}
          </pre>
        </div>
      )}

      {/* Tab 3: Boto3 Controller */}
      {activeTab === 'boto3' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>Boto3 Predictive Scaling Daemon (aws/orchestrator_daemon.py)</span>
            </h2>
            <button
              onClick={() => copyToClipboard(boto3Snippet, 'boto3')}
              className="flex items-center space-x-1 px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              {copied === 'boto3' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'boto3' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-purple-300 font-mono text-xs overflow-x-auto">
            {boto3Snippet}
          </pre>
        </div>
      )}

      {/* Tab 4: Teardown Guide */}
      {activeTab === 'teardown' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <PowerOff className="w-5 h-5" />
            <span>Clean Teardown Instructions (Zero Cloud Incurred Cost)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            To ensure zero recurring cloud fees after finishing your academic presentation, execute the following teardown commands:
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="text-slate-400"># 1. Destroy all provisioned resources via Terraform:</div>
            <div className="text-emerald-400 bg-slate-900 p-2.5 rounded border border-slate-800">
              cd aws/terraform &amp;&amp; terraform destroy -auto-approve
            </div>

            <div className="text-slate-400 pt-2"># 2. Or terminate via AWS CLI directly:</div>
            <div className="text-emerald-400 bg-slate-900 p-2.5 rounded border border-slate-800">
              aws autoscaling update-auto-scaling-group --auto-scaling-group-name cloudpilot-asg --min-size 0 --desired-capacity 0
            </div>
            <div className="text-emerald-400 bg-slate-900 p-2.5 rounded border border-slate-800">
              aws elbv2 delete-load-balancer --load-balancer-arn &lt;ALB_ARN&gt;
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

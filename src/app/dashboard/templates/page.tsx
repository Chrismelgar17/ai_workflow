'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/label-badge'
import { 
  Search, 
  Star, 
  Download, 
  Eye, 
  Filter,
  FileText,
  Workflow,
  Mail,
  Database,
  Bot
} from 'lucide-react'

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Templates', count: 24 },
    { id: 'customer', name: 'Customer Service', count: 6 },
    { id: 'sales', name: 'Sales & Marketing', count: 5 },
    { id: 'hr', name: 'Human Resources', count: 4 },
    { id: 'finance', name: 'Finance & Accounting', count: 4 },
    { id: 'operations', name: 'Operations', count: 5 }
  ]

  const templates = [
    {
      id: 1,
      name: 'Customer Onboarding',
      description: 'Automated workflow for new customer setup and welcome process',
      category: 'customer',
      icon: Bot,
      featured: true,
      downloads: 156,
      rating: 4.8,
      tags: ['automation', 'crm', 'email']
    },
    {
      id: 2,
      name: 'Invoice Processing',
      description: 'AI-powered invoice extraction and approval workflow',
      category: 'finance',
      icon: FileText,
      featured: true,
      downloads: 89,
      rating: 4.6,
      tags: ['ai', 'finance', 'approval']
    },
    {
      id: 3,
      name: 'Lead Qualification',
      description: 'Automated lead scoring and qualification process',
      category: 'sales',
      icon: Workflow,
      featured: false,
      downloads: 67,
      rating: 4.4,
      tags: ['sales', 'scoring', 'crm']
    },
    {
      id: 4,
      name: 'Employee Feedback',
      description: 'Collect and analyze employee feedback with sentiment analysis',
      category: 'hr',
      icon: Mail,
      featured: false,
      downloads: 43,
      rating: 4.2,
      tags: ['hr', 'feedback', 'sentiment']
    },
    {
      id: 5,
      name: 'Data Backup',
      description: 'Automated data backup and verification workflow',
      category: 'operations',
      icon: Database,
      featured: false,
      downloads: 78,
      rating: 4.7,
      tags: ['backup', 'data', 'automation']
    },
    {
      id: 6,
      name: 'Support Ticket Routing',
      description: 'Intelligent routing of support tickets based on content and priority',
      category: 'customer',
      icon: Bot,
      featured: true,
      downloads: 92,
      rating: 4.5,
      tags: ['support', 'ai', 'routing']
    }
  ]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const featuredTemplates = templates.filter(t => t.featured)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Template Library
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and deploy pre-built workflow templates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="flex items-center gap-2"
          >
            {category.name}
            <Badge variant="secondary" className="ml-1">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Featured Templates */}
      {selectedCategory === 'all' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Featured Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <template.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm ml-1">{template.rating}</span>
                          </div>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{template.downloads} downloads</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="default">Featured</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {template.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button className="flex-1" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {selectedCategory === 'all' ? 'All Templates' : categories.find(c => c.id === selectedCategory)?.name}
          <span className="text-gray-500 ml-2">({filteredTemplates.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <template.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm ml-1">{template.rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{template.downloads} downloads</span>
                      </div>
                    </div>
                  </div>
                  {template.featured && <Badge variant="default">Featured</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {template.description}
                </CardDescription>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button className="flex-1" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search terms or category filter
          </p>
        </div>
      )}
    </div>
  )
}
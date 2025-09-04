#!/usr/bin/env python3
"""
Supabase Project Setup Script
This script helps you create or retrieve Supabase project credentials
"""

from playwright.sync_api import sync_playwright
import time
import json
import os

def setup_supabase():
    print("\n" + "="*60)
    print("  SUPABASE PROJECT SETUP FOR HIKEATHON 2025")
    print("="*60)
    
    with sync_playwright() as p:
        # Launch browser in non-headless mode so user can interact
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        print("\n📌 Opening Supabase website...")
        page.goto("https://supabase.com")
        page.wait_for_load_state("networkidle")
        
        print("\n" + "-"*50)
        print("STEP 1: SIGN IN TO SUPABASE")
        print("-"*50)
        print("\nPlease sign in to Supabase using one of these methods:")
        print("  • GitHub (recommended)")
        print("  • Email")
        print("  • SSO")
        
        # Try to find and click sign in button
        try:
            sign_in_link = page.get_by_role("link", name="Sign in")
            if sign_in_link.is_visible():
                sign_in_link.click()
                print("\n✓ Redirecting to sign in page...")
        except:
            # Try alternative button text
            try:
                dashboard_link = page.get_by_role("link", name="Dashboard")
                if dashboard_link.is_visible():
                    dashboard_link.click()
                    print("\n✓ Going to dashboard...")
            except:
                print("\n⚠️  Please manually click the Sign In button")
        
        input("\n⏸️  Press ENTER after you have signed in...")
        
        # Navigate to dashboard
        current_url = page.url
        if "app.supabase" not in current_url:
            print("\n📌 Navigating to Supabase dashboard...")
            page.goto("https://app.supabase.com")
            page.wait_for_load_state("networkidle")
        
        print("\n" + "-"*50)
        print("STEP 2: CREATE OR SELECT PROJECT")
        print("-"*50)
        
        choice = input("\nDo you want to:\n1. Create a NEW project\n2. Use an EXISTING project\n\nEnter choice (1 or 2): ")
        
        if choice == "1":
            print("\n📌 Creating new project...")
            print("\nPlease follow these steps in the browser:")
            print("1. Click 'New Project' button")
            print("2. Project name: 'hikeathon-2025'")
            print("3. Database Password: (choose a strong password)")
            print("4. Region: Choose nearest to your location (preferably EU)")
            print("5. Click 'Create Project'")
            print("\n⏳ This may take 1-2 minutes...")
            
            input("\n⏸️  Press ENTER after project is created...")
            
        else:
            print("\n📌 Select your existing project from the dashboard")
            input("\n⏸️  Press ENTER after selecting your project...")
        
        print("\n" + "-"*50)
        print("STEP 3: RETRIEVE PROJECT CREDENTIALS")
        print("-"*50)
        
        print("\n📌 Now we'll get your project URL and anon key...")
        print("\nPlease navigate to:")
        print("1. Click on 'Settings' (gear icon) in the left sidebar")
        print("2. Click on 'API' under Configuration")
        
        input("\n⏸️  Press ENTER when you're on the API settings page...")
        
        # Try to extract the credentials
        try:
            # Wait for the API settings page to load
            page.wait_for_selector("text=Project URL", timeout=5000)
            
            # Try to find and copy the project URL
            project_url_element = page.locator("input[readonly]").first
            if project_url_element.is_visible():
                project_url = project_url_element.input_value()
                print(f"\n✓ Found Project URL: {project_url}")
            else:
                project_url = input("\n❓ Please copy and paste the Project URL here: ")
            
            # Try to find the anon key
            print("\n📌 Looking for anon key...")
            print("It should be under 'Project API keys' section, labeled as 'anon public'")
            
            anon_key = input("\n❓ Please copy and paste the anon/public key here: ")
            
        except:
            print("\n⚠️  Couldn't automatically extract credentials")
            project_url = input("\n❓ Please copy and paste the Project URL here: ")
            anon_key = input("\n❓ Please copy and paste the anon/public key here: ")
        
        print("\n" + "="*60)
        print("  CREDENTIALS RETRIEVED SUCCESSFULLY!")
        print("="*60)
        
        # Save to .env file
        save_choice = input("\n💾 Do you want to save these to .env file? (y/n): ")
        
        if save_choice.lower() == 'y':
            env_content = f"""# Supabase Configuration
SUPABASE_URL={project_url}
SUPABASE_ANON_KEY={anon_key}

# Add these to .env.local for production
NEXT_PUBLIC_SUPABASE_URL={project_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}
"""
            
            with open('.env', 'w') as f:
                f.write(env_content)
            
            print("\n✅ Credentials saved to .env file!")
            print("\n⚠️  Important: Add .env to .gitignore to keep credentials secure!")
        
        print("\n" + "-"*50)
        print("SUMMARY")
        print("-"*50)
        print(f"\n🔗 Project URL: {project_url}")
        print(f"🔑 Anon Key: {anon_key[:20]}...")  # Show only first 20 chars for security
        
        print("\n📝 Next steps:")
        print("1. Add these credentials to your environment variables")
        print("2. Initialize Supabase client in your Nuxt app")
        print("3. Run database migrations")
        
        browser.close()
        print("\n✅ Setup complete! Browser closed.")
        
        return {
            "url": project_url,
            "anon_key": anon_key
        }

if __name__ == "__main__":
    try:
        credentials = setup_supabase()
        print("\n🎉 Supabase setup completed successfully!")
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        print("\nPlease try again or set up credentials manually")
<?php
/**
 * Tine 2.0
 * 
 * @package     Tinebase
 * @subpackage  WebDav
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @copyright   Copyright (c) 2010-2010 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Lars Kneschke <l.kneschke@metaways.de>
 * @version     $Id$
 * 
 */

/**
 * class to handle webdav root
 * 
 * @package     Tinebase
 * @subpackage  WebDav
 */
class Tinebase_WebDav_Root extends Sabre_DAV_Directory 
{
    protected $_path;
    
    public function __construct($_path) 
    {
        $this->_path = $_path;
    }
    
    public function getChildren() 
    {
        Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . ' path: ' . $this->_path);
        
        $children = array();
        
        if (empty($this->_path)) {
            $children[] = $this->getChild('webdav');
        } else {
            // Loop through the directory, and create objects for each node
            foreach(Tinebase_Core::getUser()->getApplications() as $application) {
                #Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ .' application: ' . $application);
                try {
                    $children[] = $this->getChild($application);
                    Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ .' added application: ' . $application);
                } catch (Sabre_DAV_Exception_FileNotFound $sdefnf) {
                    continue;
                }
            }
        }
        
        return $children;            
    }
    
    public function getChild($_name) 
    {
        if (empty($this->_path) || strtolower($_name) == 'webdav') {
            return new Tinebase_WebDav_Root('webdav');
        } else {
            // appname[/subdir][/subdir]...
            $pathParts = explode('/', $_name, 2);
            list($appName, $appPath) = array(ucfirst($pathParts[0]), isset($pathParts[1]) ? $pathParts[1] : null);
            Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . ' appname: ' . $appName . ' apppath: ' . $appPath);

            if (!Tinebase_Application::getInstance()->isInstalled($appName)) {
                throw new Sabre_DAV_Exception_FileNotFound('The file with name: ' . $_name . ' could not be found');
            }
            
            if (!Tinebase_Core::getUser()->hasRight($appName, Tinebase_Acl_Rights::RUN)) {
                throw new Sabre_DAV_Exception_FileNotFound('The file with name: ' . $_name . ' could not be found');
            }
            
            $className = $appName . '_Frontend_WebDav';
            if (!@class_exists($className)) {
                throw new Sabre_DAV_Exception_FileNotFound('The file with name: ' . $_name . ' could not be found');
            }
            
            $application = new $className($appName . '/' . $appPath);
            
            $node = $application->getNodeForCurrentPath();
            
            return $node;
        }
    }
    
    public function getName() 
    {
        return strtolower(basename($this->_path));
    }    
}